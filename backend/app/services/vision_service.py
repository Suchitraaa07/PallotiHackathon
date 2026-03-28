from __future__ import annotations

from fastapi import HTTPException, UploadFile

from app.services.risk_service import build_risk_assessment
from app.services.species_service import detect_snake, predict_species

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


async def analyze_uploaded_image(file: UploadFile) -> dict[str, str | float]:
    if not file.content_type or file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Upload a PNG, JPG, or WEBP image.")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")

    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 10MB or smaller.")

    try:
        detection = detect_snake(image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Snake detection failed: {exc}") from exc

    if not bool(detection["is_snake"]):
        return {
            "species": "Not a snake",
            "confidence": float(detection["confidence"]),
            "risk_level": "UNKNOWN",
            "recommended_action": (
                "The image does not appear to contain a snake clearly enough. "
                "Upload a focused snake photo for analysis."
            ),
            "detection_source": str(detection["source"]),
        }

    try:
        prediction = predict_species(image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Image analysis failed: {exc}") from exc

    if not bool(prediction.get("accepted", False)):
        return {
            "species": "Unclear snake image",
            "confidence": float(prediction["confidence"]),
            "risk_level": "UNKNOWN",
            "recommended_action": (
                "A snake may be present, but the classification confidence is low. "
                "Retake the photo from closer range with the snake fully visible."
            ),
            "detection_source": str(detection["source"]),
        }

    assessment = build_risk_assessment(
        species=str(prediction["species"]),
        confidence=float(prediction["confidence"]),
    )

    return {
        "species": str(prediction["species"]),
        "confidence": float(prediction["confidence"]),
        "risk_level": assessment["risk_level"],
        "recommended_action": assessment["recommended_action"],
        "detection_source": str(detection["source"]),
    }
