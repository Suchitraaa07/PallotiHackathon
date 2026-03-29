
import json
import math
import os
import socket
from datetime import datetime
from pathlib import Path
from urllib import error as url_error
from urllib import request as url_request

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from app.services.risk_service import calculate_snakebite_risk
from app.services.severity_service import calculate_severity
import struct

router = APIRouter()
REPORT_FETCH_LIMIT = 250
_reports_cache: list[dict] = []

class SymptomInput(BaseModel):
    symptoms: List[str]


class IncidentReportInput(BaseModel):
    victimName: str
    victimAge: int
    victimPhone: str
    location: str
    latitude: float | None = None
    longitude: float | None = None
    incidentDate: str
    incidentTime: str
    weatherCondition: str = ""
    temperature: float | None = None
    season: str = ""
    timeOfDay: str = ""
    environmentType: str
    snakeDescription: str = ""
    snakeType: str = "Unknown"
    venomStatus: str = "Unknown"
    additionalNotes: str = ""


class SnakebiteRiskInput(BaseModel):
    latitude: float
    longitude: float
    severity: str


def _read_env_file_var(var_name: str) -> str:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return ""

    try:
        for line in env_path.read_text(encoding="utf-8").splitlines():
            cleaned = line.strip()
            if not cleaned or cleaned.startswith("#") or "=" not in cleaned:
                continue

            key, value = cleaned.split("=", 1)
            if key.strip() == var_name:
                return value.strip().strip('"').strip("'")
    except OSError:
        return ""

    return ""


def _insert_report_to_supabase(data: IncidentReportInput) -> dict:
    supabase_url, supabase_service_role_key = _get_supabase_config()

    if not supabase_url or not supabase_service_role_key:
        raise HTTPException(
            status_code=500,
            detail="Supabase environment variables are missing.",
        )

    try:
        incident_dt = datetime.fromisoformat(
            f"{data.incidentDate}T{data.incidentTime}"
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail="Invalid incident date/time format.",
        ) from exc

    report_row = {
        "name": data.victimName,
        "age": data.victimAge,
        "phone": data.victimPhone,
        "incident_time": incident_dt.isoformat(),
        "location": data.location,
        "latitude": data.latitude,
        "longitude": data.longitude,
        "environment": data.environmentType,
        "weather_condition": data.weatherCondition,
        "temperature": data.temperature,
        "season": data.season,
        "time_of_day": data.timeOfDay,
        "notes": data.additionalNotes,
    }

    request_url = f"{supabase_url}/rest/v1/reports"
    request_headers = {
        "apikey": supabase_service_role_key,
        "Authorization": f"Bearer {supabase_service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    request_body = json.dumps(report_row).encode("utf-8")

    req = url_request.Request(
        request_url,
        data=request_body,
        headers=request_headers,
        method="POST",
    )

    try:
        with url_request.urlopen(req, timeout=12) as resp:
            raw_body = resp.read().decode("utf-8")
            parsed = json.loads(raw_body) if raw_body else []
            if isinstance(parsed, list) and parsed:
                return parsed[0]

            raise HTTPException(
                status_code=502,
                detail="Supabase insert did not return saved row.",
            )
    except url_error.HTTPError as exc:
        err_body = exc.read().decode("utf-8") if hasattr(exc, "read") else ""
        raise HTTPException(
            status_code=502,
            detail=f"Supabase insert failed: {err_body or str(exc)}",
        ) from exc
    except url_error.URLError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Supabase request failed: {exc.reason}",
        ) from exc


def _get_supabase_config() -> tuple[str, str]:
    supabase_url = (
        os.getenv("SUPABASE_URL", "") or _read_env_file_var("SUPABASE_URL")
    ).rstrip("/")
    supabase_service_role_key = os.getenv(
        "SUPABASE_SERVICE_ROLE_KEY", ""
    ) or _read_env_file_var("SUPABASE_SERVICE_ROLE_KEY")
    return supabase_url, supabase_service_role_key


def _decode_location_point(location_value: object) -> tuple[float, float] | None:
    if isinstance(location_value, dict):
        coordinates = location_value.get("coordinates")
        if isinstance(coordinates, list) and len(coordinates) >= 2:
            try:
                lon = float(coordinates[0])
                lat = float(coordinates[1])
                return lat, lon
            except (TypeError, ValueError):
                return None

    if not isinstance(location_value, str):
        return None

    value = location_value.strip()
    if not value:
        return None

    if value.startswith("POINT(") and value.endswith(")"):
        # Handle WKT if Supabase returns POINT(lon lat) text.
        inner = value[6:-1].strip()
        parts = inner.split()
        if len(parts) >= 2:
            try:
                lon = float(parts[0])
                lat = float(parts[1])
                return lat, lon
            except ValueError:
                return None

    if len(value) % 2 != 0:
        return None

    try:
        ewkb = bytes.fromhex(value)
    except ValueError:
        return None

    if len(ewkb) < 21:
        return None

    byte_order = ewkb[0]
    if byte_order == 1:
        endian = "<"
    elif byte_order == 0:
        endian = ">"
    else:
        return None

    geom_type = struct.unpack(f"{endian}I", ewkb[1:5])[0]
    has_srid = bool(geom_type & 0x20000000)
    base_type = geom_type & 0xFF
    if base_type != 1:
        return None

    offset = 5
    if has_srid:
        if len(ewkb) < offset + 4:
            return None
        offset += 4

    if len(ewkb) < offset + 16:
        return None

    lon = struct.unpack(f"{endian}d", ewkb[offset : offset + 8])[0]
    lat = struct.unpack(f"{endian}d", ewkb[offset + 8 : offset + 16])[0]
    return lat, lon


def _haversine_distance_km(
    src_lat: float, src_lon: float, dst_lat: float, dst_lon: float
) -> float:
    earth_radius_km = 6371.0

    src_lat_rad = math.radians(src_lat)
    dst_lat_rad = math.radians(dst_lat)
    delta_lat = math.radians(dst_lat - src_lat)
    delta_lon = math.radians(dst_lon - src_lon)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(src_lat_rad)
        * math.cos(dst_lat_rad)
        * math.sin(delta_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius_km * c


def _is_antivenom_candidate(name: str, city: str) -> bool:
    text = f"{name} {city}".lower()
    anti_venom_keywords = {
        "district hospital",
        "civil hospital",
        "medical college",
        "government",
        "trauma",
        "emergency",
        "multispeciality",
        "multi speciality",
        "snake bite",
        "antivenom",
        "anti venom",
    }
    return any(keyword in text for keyword in anti_venom_keywords)


def _fetch_hospitals_from_supabase() -> list[dict]:
    supabase_url, supabase_service_role_key = _get_supabase_config()

    if not supabase_url or not supabase_service_role_key:
        raise HTTPException(
            status_code=500,
            detail="Supabase environment variables are missing.",
        )

    request_url = f"{supabase_url}/rest/v1/hospitals?select=id,name,city,location"
    request_headers = {
        "apikey": supabase_service_role_key,
        "Authorization": f"Bearer {supabase_service_role_key}",
    }

    try:
        import requests

        response = requests.get(request_url, headers=request_headers, timeout=12)
        if not response.ok:
            raise HTTPException(
                status_code=502,
                detail=f"Supabase hospitals fetch failed: {response.text}",
            )

        parsed = response.json() if response.text else []
        return parsed if isinstance(parsed, list) else []
    except ImportError:
        req = url_request.Request(
            request_url,
            headers=request_headers,
            method="GET",
        )

        try:
            with url_request.urlopen(req, timeout=12) as resp:
                raw_body = resp.read().decode("utf-8")
                parsed = json.loads(raw_body) if raw_body else []
                return parsed if isinstance(parsed, list) else []
        except url_error.HTTPError as exc:
            err_body = exc.read().decode("utf-8") if hasattr(exc, "read") else ""
            raise HTTPException(
                status_code=502,
                detail=f"Supabase hospitals fetch failed: {err_body or str(exc)}",
            ) from exc
        except url_error.URLError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Supabase request failed: {exc.reason}",
            ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Supabase request failed: {exc}",
        ) from exc


def _fetch_sarpamitra_from_supabase() -> list[dict]:
    supabase_url, supabase_service_role_key = _get_supabase_config()

    if not supabase_url or not supabase_service_role_key:
        raise HTTPException(
            status_code=500,
            detail="Supabase environment variables are missing.",
        )

    request_headers = {
        "apikey": supabase_service_role_key,
        "Authorization": f"Bearer {supabase_service_role_key}",
    }

    # Try singular table first, then plural fallback.
    request_urls = [
        f"{supabase_url}/rest/v1/sarpamitra?select=id,name,phone,areas,lat,lng,rating,reviews,verified",
        f"{supabase_url}/rest/v1/sarpamitras?select=id,name,phone,areas,lat,lng,rating,reviews,verified",
    ]

    for request_url in request_urls:
        try:
            import requests

            response = requests.get(request_url, headers=request_headers, timeout=12)
            if response.ok:
                parsed = response.json() if response.text else []
                return parsed if isinstance(parsed, list) else []

            # Try next table name on 404.
            if response.status_code == 404:
                continue
            raise HTTPException(
                status_code=502,
                detail=f"Supabase sarpamitra fetch failed: {response.text}",
            )
        except ImportError:
            req = url_request.Request(
                request_url,
                headers=request_headers,
                method="GET",
            )

            try:
                with url_request.urlopen(req, timeout=12) as resp:
                    raw_body = resp.read().decode("utf-8")
                    parsed = json.loads(raw_body) if raw_body else []
                    return parsed if isinstance(parsed, list) else []
            except url_error.HTTPError as exc:
                if exc.code == 404:
                    continue
                err_body = exc.read().decode("utf-8") if hasattr(exc, "read") else ""
                raise HTTPException(
                    status_code=502,
                    detail=f"Supabase sarpamitra fetch failed: {err_body or str(exc)}",
                ) from exc
            except url_error.URLError as exc:
                raise HTTPException(
                    status_code=502,
                    detail=f"Supabase request failed: {exc.reason}",
                ) from exc
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Supabase request failed: {exc}",
            ) from exc

    return []


def _fetch_reports_from_supabase() -> tuple[list[dict], str | None]:
    global _reports_cache

    supabase_url, supabase_service_role_key = _get_supabase_config()

    if not supabase_url or not supabase_service_role_key:
        raise HTTPException(
            status_code=500,
            detail="Supabase environment variables are missing.",
        )

    request_url = (
        f"{supabase_url}/rest/v1/reports"
        "?select=id,latitude,longitude,created_at,environment,weather_condition,temperature,season,time_of_day"
        "&order=created_at.desc"
        f"&limit={REPORT_FETCH_LIMIT}"
    )
    request_headers = {
        "apikey": supabase_service_role_key,
        "Authorization": f"Bearer {supabase_service_role_key}",
    }

    try:
        import requests

        response = requests.get(request_url, headers=request_headers, timeout=20)
        if not response.ok:
            raise HTTPException(
                status_code=502,
                detail=f"Supabase reports fetch failed: {response.text}",
            )

        parsed = response.json() if response.text else []
        reports = parsed if isinstance(parsed, list) else []
        _reports_cache = reports
        return reports, None
    except ImportError:
        req = url_request.Request(
            request_url,
            headers=request_headers,
            method="GET",
        )

        try:
            with url_request.urlopen(req, timeout=20) as resp:
                raw_body = resp.read().decode("utf-8")
                parsed = json.loads(raw_body) if raw_body else []
                reports = parsed if isinstance(parsed, list) else []
                _reports_cache = reports
                return reports, None
        except url_error.HTTPError as exc:
            err_body = exc.read().decode("utf-8") if hasattr(exc, "read") else ""
            raise HTTPException(
                status_code=502,
                detail=f"Supabase reports fetch failed: {err_body or str(exc)}",
            ) from exc
        except url_error.URLError as exc:
            fallback_warning = (
                f"Supabase request failed: {exc.reason}. "
                f"Serving {len(_reports_cache)} cached reports instead."
            )
            return _reports_cache, fallback_warning
        except (TimeoutError, socket.timeout):
            fallback_warning = (
                "Supabase reports request timed out while reading the response. "
                f"Serving {len(_reports_cache)} cached reports instead."
            )
            return _reports_cache, fallback_warning

    except (TimeoutError, socket.timeout):
        fallback_warning = (
            "Supabase reports request timed out while reading the response. "
            f"Serving {len(_reports_cache)} cached reports instead."
        )
        return _reports_cache, fallback_warning
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Supabase request failed: {exc}",
        ) from exc

@router.post("/severity")
def get_severity(data: SymptomInput):
    severity = calculate_severity(data.symptoms)

    return {
        "severity": severity,
        "selected_symptoms": data.symptoms
    }


@router.post("/report-incident")
def report_incident(data: IncidentReportInput):
    inserted_report = _insert_report_to_supabase(data)

    return {
        "message": "Incident report stored successfully",
        "report": inserted_report,
    }


@router.post("/risk-score")
def get_risk_score(data: SnakebiteRiskInput):
    return calculate_snakebite_risk(
        latitude=data.latitude,
        longitude=data.longitude,
        severity=data.severity,
    )


@router.get("/reports")
def get_reports():
    reports, warning = _fetch_reports_from_supabase()

    response = {
        "count": len(reports),
        "reports": reports,
    }
    if warning:
        response["warning"] = warning

    return response


@router.get("/nearby-hospitals")
def get_nearby_hospitals(
    latitude: float,
    longitude: float,
    risk_level: str = "UNKNOWN",
    limit: int = 5,
):
    if not -90 <= latitude <= 90:
        raise HTTPException(status_code=422, detail="Invalid latitude.")
    if not -180 <= longitude <= 180:
        raise HTTPException(status_code=422, detail="Invalid longitude.")

    requested_limit = max(1, min(limit, 10))
    normalized_risk = risk_level.upper().strip() or "UNKNOWN"

    hospitals = _fetch_hospitals_from_supabase()
    ranked: list[dict] = []

    for hospital in hospitals:
        name = str(hospital.get("name") or "Unknown Hospital")
        city = str(hospital.get("city") or "")
        location = hospital.get("location")
        coords = _decode_location_point(location)
        if not coords:
            continue

        hospital_lat, hospital_lon = coords
        distance_km = _haversine_distance_km(
            latitude,
            longitude,
            hospital_lat,
            hospital_lon,
        )

        ranked.append(
            {
                "id": hospital.get("id"),
                "name": name,
                "city": city,
                "latitude": round(hospital_lat, 6),
                "longitude": round(hospital_lon, 6),
                "distance_km": round(distance_km, 2),
                "is_antivenom_candidate": _is_antivenom_candidate(name, city),
            }
        )

    if not ranked:
        return {
            "risk_level": normalized_risk,
            "user_location": {"latitude": latitude, "longitude": longitude},
            "anti_venom_hospitals": [],
            "general_hospitals": [],
            "message": "No hospitals with valid geolocation found.",
        }

    ranked.sort(key=lambda item: item["distance_km"])

    anti_venom_sorted = sorted(
        ranked,
        key=lambda item: (
            not item["is_antivenom_candidate"],
            item["distance_km"],
        ),
    )

    if normalized_risk == "HIGH":
        anti_venom_limit = requested_limit
    elif normalized_risk == "MEDIUM":
        anti_venom_limit = min(requested_limit, 4)
    else:
        anti_venom_limit = min(requested_limit, 3)

    anti_venom_hospitals = anti_venom_sorted[:anti_venom_limit]
    general_hospitals = ranked[:requested_limit]

    return {
        "risk_level": normalized_risk,
        "user_location": {"latitude": latitude, "longitude": longitude},
        "anti_venom_hospitals": anti_venom_hospitals,
        "general_hospitals": general_hospitals,
    }


@router.get("/sarpamitra")
def get_sarpamitra_contacts():
    contacts = _fetch_sarpamitra_from_supabase()
    return {
        "count": len(contacts),
        "contacts": contacts,
    }
