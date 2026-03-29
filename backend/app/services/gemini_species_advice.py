from __future__ import annotations

import json
import os

from fastapi import HTTPException
from app.services.groq_client import get_client

_species_cache: dict[str, dict[str, object]] = {}

KNOWN_SNAKES: dict[str, dict[str, object]] = {
    "indian cobra": {
        "venom_type": "Venomous",
        "danger_level": "High",
        "prevention": [
            "Use a flashlight while walking outdoors at night.",
            "Avoid handling snakes even if they seem inactive.",
            "Keep surroundings clear of debris and rodent attractants.",
        ],
        "first_aid": [
            "Keep the victim calm and still.",
            "Immobilize the bitten limb and remove tight accessories.",
            "Reach hospital immediately for antivenom-capable care.",
        ],
    },
    "common krait": {
        "venom_type": "Venomous",
        "danger_level": "High",
        "prevention": [
            "Use bed nets and avoid sleeping on bare floors.",
            "Wear footwear and use light when moving at night.",
            "Seal wall/floor cracks in rural homes.",
        ],
        "first_aid": [
            "Minimize movement and keep the patient lying down.",
            "Do not cut, suck, or apply ice to the wound.",
            "Transport urgently to hospital.",
        ],
    },
    "russell's viper": {
        "venom_type": "Venomous",
        "danger_level": "High",
        "prevention": [
            "Wear boots and long pants in fields/grass.",
            "Do not place hands into holes or dense vegetation blindly.",
            "Keep paths around home clear and visible.",
        ],
        "first_aid": [
            "Immobilize the limb and keep it below heart level.",
            "Monitor breathing and consciousness.",
            "Get emergency medical care immediately.",
        ],
    },
}

def _extract_json_block(text: str) -> dict[str, object] | None:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None

    candidate = text[start : end + 1]
    try:
        parsed = json.loads(candidate)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def _to_string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _normalize_species_name(species: str) -> str:
    return " ".join(species.strip().lower().split())


def get_species_advice(species: str) -> dict[str, object]:
    clean_species = species.strip()
    if not clean_species:
        raise HTTPException(status_code=422, detail="Species is required.")
    species_key = _normalize_species_name(clean_species)

    if species_key in _species_cache:
        return _species_cache[species_key]

    if species_key in KNOWN_SNAKES:
        result = {"species": clean_species, **KNOWN_SNAKES[species_key]}
        _species_cache[species_key] = result
        return result

    prompt = (
        "You are a snakebite safety assistant. "
        "Return valid JSON only. "
        f"Species: {clean_species}. "
        "If uncertain, set venom_type and danger_level to Unknown. "
        "Use this exact JSON schema:\n"
        "{\n"
        '  "venom_type": "",\n'
        '  "danger_level": "",\n'
        '  "prevention": [],\n'
        '  "first_aid": []\n'
        "}\n"
        "Keep each bullet concise and safety-focused."
    )

    try:
        client = get_client()
        response = client.chat.completions.create(
            model=os.getenv("GROQ_SNAKE_INFO_MODEL", "llama-3.1-8b-instant"),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=600,
        )
        model_text = (response.choices[0].message.content or "").strip()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Groq request failed: {str(exc)}",
        ) from exc

    parsed = _extract_json_block(model_text) or {}
    venom_type = str(parsed.get("venom_type") or "Unknown").strip() or "Unknown"
    danger_level = str(parsed.get("danger_level") or "Unknown").strip() or "Unknown"
    preventive_measures = _to_string_list(parsed.get("prevention"))
    first_aid = _to_string_list(parsed.get("first_aid"))
    result = {
        "species": clean_species,
        "venom_type": venom_type,
        "danger_level": danger_level,
        "prevention": preventive_measures,
        "first_aid": first_aid,
    }
    _species_cache[species_key] = result
    return result
