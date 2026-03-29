
import json
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
    supabase_url = (
        os.getenv("SUPABASE_URL", "") or _read_env_file_var("SUPABASE_URL")
    ).rstrip("/")
    supabase_service_role_key = os.getenv(
        "SUPABASE_SERVICE_ROLE_KEY", ""
    ) or _read_env_file_var("SUPABASE_SERVICE_ROLE_KEY")

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


def _fetch_reports_from_supabase() -> tuple[list[dict], str | None]:
    global _reports_cache

    supabase_url = (
        os.getenv("SUPABASE_URL", "") or _read_env_file_var("SUPABASE_URL")
    ).rstrip("/")
    supabase_service_role_key = os.getenv(
        "SUPABASE_SERVICE_ROLE_KEY", ""
    ) or _read_env_file_var("SUPABASE_SERVICE_ROLE_KEY")

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
    except (TimeoutError, socket.timeout) as exc:
        fallback_warning = (
            "Supabase reports request timed out while reading the response. "
            f"Serving {len(_reports_cache)} cached reports instead."
        )
        return _reports_cache, fallback_warning

@router.post("/severity")
def get_severity(data: SymptomInput):
    severity = calculate_severity(data.symptoms)

    return {
        "severity": severity["severity"],
        "risk_level": severity["risk_level"],
        "score": severity["score"],
        "explanation": severity["explanation"],
        "precautions": severity["precautions"],
        "matched_symptoms": severity["matched_symptoms"],
        "unmatched_symptoms": severity["unmatched_symptoms"],
        "selected_symptoms": data.symptoms,
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
