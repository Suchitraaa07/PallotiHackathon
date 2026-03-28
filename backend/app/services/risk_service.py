from __future__ import annotations

HIGH_RISK_KEYWORDS = {
    "cobra",
    "krait",
    "viper",
    "venomous",
}

MEDIUM_RISK_KEYWORDS = {
    "snake",
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
