from __future__ import annotations

import os
from functools import lru_cache
from io import BytesIO
from pathlib import Path

import torch
from PIL import Image
from torchvision import transforms
from torchvision.models import efficientnet_b0

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "species_model.pt"
DEFAULT_LABELS = ["Venomous", "Non Venomous"]
IMAGE_SIZE = 224


def _load_species_labels() -> list[str]:
    raw_labels = os.getenv("SPECIES_CLASS_NAMES", "")
    labels = [label.strip() for label in raw_labels.split(",") if label.strip()]
    return labels or DEFAULT_LABELS


SPECIES_LABELS = _load_species_labels()


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


@lru_cache(maxsize=1)
def load_species_model():
    model = efficientnet_b0(weights=None)
    model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, len(SPECIES_LABELS))

    state_dict = torch.load(MODEL_PATH, map_location="cpu")
    model.load_state_dict(state_dict)
    model.eval()
    return model


def predict_species(image_bytes: bytes) -> dict[str, float | str | int]:
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    tensor = _build_transform()(image).unsqueeze(0)

    model = load_species_model()
    with torch.inference_mode():
        logits = model(tensor)
        probabilities = torch.softmax(logits, dim=1)[0]
        predicted_index = int(torch.argmax(probabilities).item())
        confidence = float(probabilities[predicted_index].item())

    label = SPECIES_LABELS[predicted_index] if predicted_index < len(SPECIES_LABELS) else f"Species Class {predicted_index + 1}"
    return {
        "species": label,
        "confidence": round(confidence * 100, 2),
        "class_index": predicted_index,
    }
