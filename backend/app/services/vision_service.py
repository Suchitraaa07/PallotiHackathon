from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor

from fastapi import HTTPException, UploadFile

from app.services.risk_service import build_risk_assessment
from app.services.species_service import detect_snake, predict_species
from app.services.wound_service import predict_wound

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
SPECIES_CONFIDENCE_THRESHOLD = float(os.getenv("SPECIES_CONFIDENCE_THRESHOLD", "50.0"))
SPECIES_MARGIN_THRESHOLD = float(os.getenv("SPECIES_MARGIN_THRESHOLD", "10.0"))
SPECIES_MAX_ENTROPY = float(os.getenv("SPECIES_MAX_ENTROPY", "0.97"))
VERY_LOW_GATE_CONFIDENCE = float(os.getenv("VERY_LOW_GATE_CONFIDENCE", "30.0"))
HEURISTIC_CLASSIFY_FLOOR = float(os.getenv("HEURISTIC_CLASSIFY_FLOOR", "20.0"))
STRICT_CONFIDENCE_WHEN_GATE_LOW = float(
    os.getenv("STRICT_CONFIDENCE_WHEN_GATE_LOW", "75.0")
)
STRICT_MARGIN_WHEN_GATE_LOW = float(os.getenv("STRICT_MARGIN_WHEN_GATE_LOW", "15.0"))
STRONG_CLASSIFIER_CONFIDENCE = float(os.getenv("STRONG_CLASSIFIER_CONFIDENCE", "62.0"))
STRONG_CLASSIFIER_MARGIN = float(os.getenv("STRONG_CLASSIFIER_MARGIN", "18.0"))
STRONG_CLASSIFIER_MAX_ENTROPY = float(os.getenv("STRONG_CLASSIFIER_MAX_ENTROPY", "0.96"))
_MODEL_EXECUTOR = ThreadPoolExecutor(max_workers=3, thread_name_prefix="vision-models")


def _clamp_confidence(value: float) -> float:
    return max(1.0, min(99.0, value))


def _build_not_snake_confidence_from_gate(gate_confidence: float) -> float:
    # detection confidence is interpreted as snake-likelihood in heuristic mode.
    # for "not snake" responses, expose inverse evidence.
    return _clamp_confidence(100.0 - gate_confidence)


def _build_not_snake_confidence_from_uncertainty(
    gate_confidence: float,
    classifier_confidence: float,
    classifier_margin: float,
    classifier_entropy: float,
) -> float:
    gate_component = max(0.0, (VERY_LOW_GATE_CONFIDENCE - gate_confidence) * 2.0)
    low_conf_component = max(
        0.0,
        (SPECIES_CONFIDENCE_THRESHOLD - classifier_confidence)
        / max(SPECIES_CONFIDENCE_THRESHOLD, 1.0)
        * 100.0,
    )
    low_margin_component = max(
        0.0,
        (SPECIES_MARGIN_THRESHOLD - classifier_margin)
        / max(SPECIES_MARGIN_THRESHOLD, 1.0)
        * 100.0,
    )
    high_entropy_component = max(
        0.0,
        (classifier_entropy - SPECIES_MAX_ENTROPY)
        / max(1.0 - SPECIES_MAX_ENTROPY, 0.01)
        * 100.0,
    )

    combined = (
        gate_component * 0.35
        + low_conf_component * 0.30
        + low_margin_component * 0.20
        + high_entropy_component * 0.15
    )
    # keep uncertainty-based rejection from appearing as fake 100%.
    return _clamp_confidence(55.0 + min(combined, 40.0))


def _run_all_models(image_bytes: bytes) -> tuple[dict, dict, dict]:
    snake_future = _MODEL_EXECUTOR.submit(detect_snake, image_bytes)
    species_future = _MODEL_EXECUTOR.submit(predict_species, image_bytes)
    wound_future = _MODEL_EXECUTOR.submit(predict_wound, image_bytes)

    detection_result = snake_future.result()
    try:
        species_result = species_future.result()
    except Exception:
        species_result = {
            "species": "Unknown",
            "confidence": 0.0,
            "class_index": -1,
            "margin": 0.0,
            "entropy": 1.0,
            "accepted": False,
            "available": False,
        }

    try:
        wound_result = wound_future.result()
    except Exception:
        wound_result = {
            "available": False,
            "label": "Unavailable",
            "confidence": 0.0,
        }

    return detection_result, species_result, wound_result


async def analyze_uploaded_image(file: UploadFile) -> dict[str, object]:
    if not file.content_type or file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Upload a PNG, JPG, or WEBP image.")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")

    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be 10MB or smaller.")

    try:
        detection, prediction, wound = _run_all_models(image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model inference failed: {exc}") from exc

    detection_source = str(detection.get("source", ""))
    gate_confidence = float(detection["confidence"])
    should_fallback_to_classifier = (
        detection_source.startswith("heuristic")
        and gate_confidence >= HEURISTIC_CLASSIFY_FLOOR
    )

    if not bool(detection["is_snake"]) and not should_fallback_to_classifier:
        gate_confidence = float(detection["confidence"])
        return {
            "species": "Not a snake",
            "confidence": _build_not_snake_confidence_from_gate(gate_confidence),
            "risk_level": "UNKNOWN",
            "recommended_action": (
                "The image does not appear to contain a snake clearly enough. "
                "Upload a focused snake photo for analysis."
            ),
            "detection_source": detection_source,
            "decision_stage": "detection",
            "model_outputs": {
                "snake_detector": detection,
                "species_classifier": prediction,
                "wound_classifier": wound,
            },
        }

    classifier_confidence = float(prediction["confidence"])
    classifier_margin = float(prediction.get("margin", 0.0))
    classifier_entropy = float(prediction.get("entropy", 1.0))
    gate_confidence = float(detection["confidence"])

    low_confidence = classifier_confidence < SPECIES_CONFIDENCE_THRESHOLD
    low_margin = classifier_margin < SPECIES_MARGIN_THRESHOLD
    high_entropy = classifier_entropy > SPECIES_MAX_ENTROPY
    if detection_source.startswith("heuristic"):
        # Heuristic gate is noisy on real-world photos; avoid over-relying on entropy.
        uncertain_prediction = (low_confidence and low_margin)
    else:
        uncertainty_flags = int(low_confidence) + int(low_margin) + int(high_entropy)
        uncertain_prediction = uncertainty_flags >= 2

    strong_classifier_signal = (
        classifier_confidence >= STRONG_CLASSIFIER_CONFIDENCE
        and classifier_margin >= STRONG_CLASSIFIER_MARGIN
        and classifier_entropy <= STRONG_CLASSIFIER_MAX_ENTROPY
    )
    if strong_classifier_signal and gate_confidence >= VERY_LOW_GATE_CONFIDENCE:
        uncertain_prediction = False

    # Without a trained snake-detector model, heuristic gating can over-pass
    # screenshot/UI images; be strict unless snake-gate evidence is strong.
    if detection_source.startswith("heuristic"):
        if gate_confidence < 55.0 and classifier_confidence >= 95.0:
            uncertain_prediction = True

    if gate_confidence < VERY_LOW_GATE_CONFIDENCE:
        uncertain_prediction = (
            uncertain_prediction
            or classifier_confidence < STRICT_CONFIDENCE_WHEN_GATE_LOW
            or classifier_margin < STRICT_MARGIN_WHEN_GATE_LOW
        )

    accepted_by_classifier = bool(prediction.get("accepted", False)) or strong_classifier_signal
    if uncertain_prediction or (not accepted_by_classifier and gate_confidence < 45.0):
        not_snake_confidence = _build_not_snake_confidence_from_uncertainty(
            gate_confidence=gate_confidence,
            classifier_confidence=classifier_confidence,
            classifier_margin=classifier_margin,
            classifier_entropy=classifier_entropy,
        )
        return {
            "species": "Not a snake",
            "confidence": not_snake_confidence,
            "risk_level": "UNKNOWN",
            "recommended_action": (
                "Image was uncertain for snake classification. "
                "Upload a close, well-lit photo with full snake body visibility."
            ),
            "detection_source": detection_source,
            "decision_stage": "classification",
            "model_outputs": {
                "snake_detector": detection,
                "species_classifier": prediction,
                "wound_classifier": wound,
            },
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
        "detection_source": detection_source,
        "decision_stage": "classification",
        "model_outputs": {
            "snake_detector": detection,
            "species_classifier": prediction,
            "wound_classifier": wound,
        },
    }
