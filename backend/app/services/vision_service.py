from __future__ import annotations

from fastapi import HTTPException, UploadFile

from app.services.risk_service import build_risk_assessment
from app.services.species_service import predict_species

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
        prediction = predict_species(image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Image analysis failed: {exc}") from exc

    assessment = build_risk_assessment(
        species=str(prediction["species"]),
        confidence=float(prediction["confidence"]),
    )

    return {
        "species": str(prediction["species"]),
        "confidence": float(prediction["confidence"]),
        "risk_level": assessment["risk_level"],
        "recommended_action": assessment["recommended_action"],
    }
