from __future__ import annotations

import re

CANONICAL_WEIGHTS = {
    "swellingatbitesite": 2,
    "severepain": 3,
    "bleeding": 4,
    "nauseavomiting": 2,
    "difficultybreathing": 5,
    "numbnesstingling": 3,
    "blurredvision": 3,
    "weaknessfatigue": 2,
}

LOW_PRECAUTIONS = [
    "Keep the affected limb still and below heart level.",
    "Remove rings, tight clothing, or constricting items near the bite area.",
    "Observe symptoms for the next few hours and seek medical advice if they worsen.",
]

MEDIUM_PRECAUTIONS = [
    "Immobilize the bitten limb and keep the patient calm and still.",
    "Do not cut, suck, or apply ice/chemicals to the bite.",
    "Go to the nearest hospital quickly for observation and treatment.",
]

HIGH_PRECAUTIONS = [
    "Call emergency services (108) immediately.",
    "Lay the patient down, keep movement minimal, and monitor breathing.",
    "Transport urgently to a hospital with antivenom support.",
]


def _normalize_symptom(symptom: str) -> str:
    lowered = symptom.strip().lower()
    return re.sub(r"[^a-z0-9]+", "", lowered)


def _resolve_level(score: int) -> str:
    if score <= 4:
        return "Low"
    if score <= 10:
        return "Medium"
    return "High"


def _build_explanation(level: str, score: int) -> str:
    if level == "High":
        return f"Symptom score {score} indicates severe envenomation risk. Immediate hospital care is required."
    if level == "Medium":
        return f"Symptom score {score} indicates moderate risk. Urgent medical evaluation is recommended."
    return f"Symptom score {score} indicates lower immediate risk. Continue close monitoring and follow first aid."


def _build_precautions(level: str) -> list[str]:
    if level == "High":
        return HIGH_PRECAUTIONS
    if level == "Medium":
        return MEDIUM_PRECAUTIONS
    return LOW_PRECAUTIONS


def calculate_severity(symptoms: list[str]) -> dict[str, object]:
    score = 0
    matched: list[str] = []
    unknown: list[str] = []

    for symptom in symptoms:
        key = _normalize_symptom(symptom)
        weight = CANONICAL_WEIGHTS.get(key)
        if weight is None:
            unknown.append(symptom)
            continue
        matched.append(symptom)
        score += weight

    level = _resolve_level(score)
    return {
        "severity": level,
        "risk_level": level.upper(),
        "score": score,
        "explanation": _build_explanation(level, score),
        "precautions": _build_precautions(level),
        "matched_symptoms": matched,
        "unmatched_symptoms": unknown,
    }
