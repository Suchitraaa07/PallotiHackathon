from __future__ import annotations

import os
from functools import lru_cache
from io import BytesIO
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from torchvision import transforms
from torchvision.models import efficientnet_b0

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "species_model.pt"
DETECTOR_MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "snake_detector.pt"
DEFAULT_LABELS = ["Venomous", "Non Venomous"]
DETECTOR_LABELS = ["Not Snake", "Snake"]
IMAGE_SIZE = 224
SNAKE_DETECTION_THRESHOLD = 0.7
SPECIES_CONFIDENCE_THRESHOLD = 65.0


def _load_species_labels() -> list[str]:
    raw_labels = os.getenv("SPECIES_CLASS_NAMES", "")
    labels = [label.strip() for label in raw_labels.split(",") if label.strip()]
    return labels or DEFAULT_LABELS


SPECIES_LABELS = _load_species_labels()


def _load_detector_labels() -> list[str]:
    raw_labels = os.getenv("SNAKE_DETECTOR_CLASS_NAMES", "")
    labels = [label.strip() for label in raw_labels.split(",") if label.strip()]
    return labels or DETECTOR_LABELS


SNAKE_DETECTOR_LABELS = _load_detector_labels()


def _build_transform() -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ]
    )


def _build_classifier(num_classes: int):
    model = efficientnet_b0(weights=None)
    model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, num_classes)
    model.eval()
    return model


def _open_image(image_bytes: bytes) -> Image.Image:
    return Image.open(BytesIO(image_bytes)).convert("RGB")


def _prepare_tensor(image: Image.Image) -> torch.Tensor:
    return _build_transform()(image).unsqueeze(0)


def _run_classifier(
    model: torch.nn.Module,
    tensor: torch.Tensor,
    labels: list[str],
) -> dict[str, float | str | int]:
    with torch.inference_mode():
        logits = model(tensor)
        probabilities = torch.softmax(logits, dim=1)[0]
        predicted_index = int(torch.argmax(probabilities).item())
        confidence = float(probabilities[predicted_index].item())

    label = (
        labels[predicted_index]
        if predicted_index < len(labels)
        else f"Class {predicted_index + 1}"
    )
    return {
        "label": label,
        "confidence": confidence,
        "class_index": predicted_index,
    }


@lru_cache(maxsize=1)
def load_species_model():
    model = _build_classifier(len(SPECIES_LABELS))
    state_dict = torch.load(MODEL_PATH, map_location="cpu")
    model.load_state_dict(state_dict)
    return model


@lru_cache(maxsize=1)
def load_snake_detector_model():
    if not DETECTOR_MODEL_PATH.exists():
        return None

    model = _build_classifier(len(SNAKE_DETECTOR_LABELS))
    state_dict = torch.load(DETECTOR_MODEL_PATH, map_location="cpu")
    model.load_state_dict(state_dict)
    return model


def _heuristic_snake_gate(image: Image.Image) -> float:
    grayscale = image.resize((IMAGE_SIZE, IMAGE_SIZE)).convert("L")
    pixels = np.asarray(grayscale, dtype=np.float32) / 255.0

    gradient_x = np.abs(np.diff(pixels, axis=1))
    gradient_y = np.abs(np.diff(pixels, axis=0))
    edge_energy = np.zeros_like(pixels)
    edge_energy[:, 1:] += gradient_x
    edge_energy[1:, :] += gradient_y

    threshold = float(np.percentile(edge_energy, 88))
    edge_mask = edge_energy >= threshold
    edge_count = int(edge_mask.sum())
    if edge_count < 120:
        return 0.08

    coordinates = np.argwhere(edge_mask)
    row_min, col_min = coordinates.min(axis=0)
    row_max, col_max = coordinates.max(axis=0)
    height = max(int(row_max - row_min + 1), 1)
    width = max(int(col_max - col_min + 1), 1)

    aspect_ratio = max(height, width) / max(min(height, width), 1)
    coverage = edge_count / float(IMAGE_SIZE * IMAGE_SIZE)
    elongated_score = min(max((aspect_ratio - 1.6) / 4.0, 0.0), 1.0)
    coverage_score = min(max((0.22 - coverage) / 0.22, 0.0), 1.0)
    edge_score = min(edge_count / 3200.0, 1.0)

    return max(
        0.0,
        min(0.95, elongated_score * 0.5 + coverage_score * 0.25 + edge_score * 0.25),
    )


def detect_snake(image_bytes: bytes) -> dict[str, float | str | bool]:
    image = _open_image(image_bytes)
    tensor = _prepare_tensor(image)
    detector_model = load_snake_detector_model()

    if detector_model is not None:
        prediction = _run_classifier(detector_model, tensor, SNAKE_DETECTOR_LABELS)
        label = str(prediction["label"])
        confidence = float(prediction["confidence"])
        is_snake = label.strip().lower() == "snake" and confidence >= SNAKE_DETECTION_THRESHOLD
        return {
            "is_snake": is_snake,
            "confidence": round(confidence * 100, 2),
            "label": label,
            "source": "model",
        }

    heuristic_confidence = _heuristic_snake_gate(image)
    return {
        "is_snake": heuristic_confidence >= SNAKE_DETECTION_THRESHOLD,
        "confidence": round(heuristic_confidence * 100, 2),
        "label": "Snake" if heuristic_confidence >= SNAKE_DETECTION_THRESHOLD else "Not Snake",
        "source": "heuristic",
    }


def predict_species(image_bytes: bytes) -> dict[str, float | str | int]:
    image = _open_image(image_bytes)
    tensor = _prepare_tensor(image)

    model = load_species_model()
    prediction = _run_classifier(model, tensor, SPECIES_LABELS)
    label = str(prediction["label"])
    confidence = float(prediction["confidence"])
    return {
        "species": label,
        "confidence": round(confidence * 100, 2),
        "class_index": int(prediction["class_index"]),
        "accepted": round(confidence * 100, 2) >= SPECIES_CONFIDENCE_THRESHOLD,
    }
