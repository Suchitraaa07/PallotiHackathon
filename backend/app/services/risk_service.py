from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from urllib import error as url_error
from urllib import parse as url_parse
from urllib import request as url_request

from fastapi import HTTPException

HIGH_RISK_KEYWORDS = {
    "cobra",
    "krait",
    "viper",
    "venomous",
}

MEDIUM_RISK_KEYWORDS = {
    "snake",
}

EARTH_RADIUS_KM = 6371.0
INCIDENT_RADIUS_KM = 2.0
MAX_INCIDENT_DENSITY = 5
OPENWEATHER_ENDPOINT = "https://api.openweathermap.org/data/2.5/weather"


@dataclass(frozen=True)
class IncidentRecord:
    latitude: float
    longitude: float
    severity: str


_incident_history: list[IncidentRecord] = []
_incident_history_lock = Lock()


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


def _normalize_severity(severity: str) -> str:
    normalized = severity.strip().capitalize()
    if normalized not in {"Low", "Medium", "High"}:
        raise HTTPException(
            status_code=422,
            detail="Severity must be one of: Low, Medium, High.",
        )

    return normalized


def _get_severity_weight(severity: str) -> float:
    severity_weights = {
        "Low": 0.3,
        "Medium": 0.6,
        "High": 1.0,
    }
    return severity_weights[_normalize_severity(severity)]


def haversine_distance_km(
    latitude_1: float,
    longitude_1: float,
    latitude_2: float,
    longitude_2: float,
) -> float:
    lat1_rad = math.radians(latitude_1)
    lon1_rad = math.radians(longitude_1)
    lat2_rad = math.radians(latitude_2)
    lon2_rad = math.radians(longitude_2)

    delta_lat = lat2_rad - lat1_rad
    delta_lon = lon2_rad - lon1_rad

    haversine_value = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    )
    angular_distance = 2 * math.atan2(
        math.sqrt(haversine_value),
        math.sqrt(1 - haversine_value),
    )
    return EARTH_RADIUS_KM * angular_distance


def _normalize_temperature(temp_celsius: float) -> float:
    return max(0.0, min(temp_celsius / 40.0, 1.0))


def _normalize_humidity(humidity: float) -> float:
    return max(0.0, min(humidity / 100.0, 1.0))


def _normalize_density(nearby_incidents: int) -> float:
    return max(0.0, min(nearby_incidents / MAX_INCIDENT_DENSITY, 1.0))


def _resolve_risk_level(risk_score: float) -> str:
    if risk_score >= 0.7:
        return "High"
    if risk_score >= 0.4:
        return "Medium"
    return "Low"


def _get_openweather_api_key() -> str:
    api_key = os.getenv("OPENWEATHERMAP_API_KEY", "") or _read_env_file_var(
        "OPENWEATHERMAP_API_KEY"
    )
    if api_key:
        return api_key

    legacy_api_key = os.getenv("OPENWEATHER_API_KEY", "") or _read_env_file_var(
        "OPENWEATHER_API_KEY"
    )
    if legacy_api_key:
        return legacy_api_key

    raise HTTPException(
        status_code=500,
        detail="OpenWeatherMap API key is missing.",
    )


def fetch_weather(latitude: float, longitude: float) -> dict[str, float]:
    api_key = _get_openweather_api_key()
    query_string = url_parse.urlencode(
        {
            "lat": latitude,
            "lon": longitude,
            "appid": api_key,
            "units": "metric",
        }
    )
    request_url = f"{OPENWEATHER_ENDPOINT}?{query_string}"
    request = url_request.Request(request_url, method="GET")

    try:
        with url_request.urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except url_error.HTTPError as exc:
        error_body = exc.read().decode("utf-8") if hasattr(exc, "read") else ""
        raise HTTPException(
            status_code=502,
            detail=f"OpenWeatherMap request failed: {error_body or str(exc)}",
        ) from exc
    except url_error.URLError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"OpenWeatherMap request failed: {exc.reason}",
        ) from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail="OpenWeatherMap returned invalid JSON.",
        ) from exc

    main_payload = payload.get("main", {})
    temp = main_payload.get("temp")
    humidity = main_payload.get("humidity")

    if temp is None or humidity is None:
        raise HTTPException(
            status_code=502,
            detail="OpenWeatherMap response did not include temperature and humidity.",
        )

    return {
        "temp": float(temp),
        "humidity": float(humidity),
    }


def count_nearby_incidents(latitude: float, longitude: float) -> int:
    with _incident_history_lock:
        return sum(
            1
            for incident in _incident_history
            if haversine_distance_km(
                latitude,
                longitude,
                incident.latitude,
                incident.longitude,
            )
            <= INCIDENT_RADIUS_KM
        )


def add_incident_report(latitude: float, longitude: float, severity: str) -> None:
    incident = IncidentRecord(
        latitude=latitude,
        longitude=longitude,
        severity=_normalize_severity(severity),
    )
    with _incident_history_lock:
        _incident_history.append(incident)


def calculate_snakebite_risk(
    latitude: float,
    longitude: float,
    severity: str,
) -> dict[str, float | int | str | dict[str, float]]:
    normalized_severity = _normalize_severity(severity)
    weather = fetch_weather(latitude=latitude, longitude=longitude)
    nearby_incidents = count_nearby_incidents(latitude=latitude, longitude=longitude)

    severity_weight = _get_severity_weight(normalized_severity)
    temp_factor = _normalize_temperature(weather["temp"])
    humidity_factor = _normalize_humidity(weather["humidity"])
    density_factor = _normalize_density(nearby_incidents)

    risk_score = (
        (severity_weight * 0.5)
        + (temp_factor * 0.2)
        + (humidity_factor * 0.1)
        + (density_factor * 0.2)
    )
    risk_score = round(max(0.0, min(risk_score, 1.0)), 4)

    add_incident_report(
        latitude=latitude,
        longitude=longitude,
        severity=normalized_severity,
    )

    return {
        "risk_score": risk_score,
        "risk_level": _resolve_risk_level(risk_score),
        "weather": weather,
        "nearby_incidents": nearby_incidents,
    }


def build_risk_assessment(species: str, confidence: float) -> dict[str, str]:
    normalized_species = species.lower()

    if any(keyword in normalized_species for keyword in HIGH_RISK_KEYWORDS):
        risk_level = "HIGH"
        action = "Visit hospital immediately and keep the affected limb still."
    elif any(keyword in normalized_species for keyword in MEDIUM_RISK_KEYWORDS):
        risk_level = "MEDIUM"
        action = "Seek medical care as soon as possible and continue monitoring symptoms."
    elif confidence < 60:
        risk_level = "UNKNOWN"
        action = "Prediction confidence is low. Please retake the photo and get medical advice."
    else:
        risk_level = "LOW"
        action = "Clean the area, monitor symptoms closely, and seek care if they worsen."

    return {
        "risk_level": risk_level,
        "recommended_action": action,
    }
