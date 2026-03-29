from __future__ import annotations

import os
from functools import lru_cache
from io import BytesIO
from pathlib import Path

import torch
from PIL import Image
from torchvision import transforms
from torchvision.models import efficientnet_b0

WOUND_MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "wound_model.pth"
WOUND_LABELS = [label.strip() for label in os.getenv("WOUND_CLASS_NAMES", "No Wound,Wound").split(",") if label.strip()]
IMAGE_SIZE = 224


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


@lru_cache(maxsize=1)
def load_wound_model():
    if not WOUND_MODEL_PATH.exists():
        return None

    model = _build_classifier(len(WOUND_LABELS))
    state_dict = torch.load(WOUND_MODEL_PATH, map_location="cpu")
    model.load_state_dict(state_dict)
    return model


def predict_wound(image_bytes: bytes) -> dict[str, float | str | bool]:
    model = load_wound_model()
    if model is None:
        return {
            "available": False,
            "label": "Unavailable",
            "confidence": 0.0,
        }

    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    tensor = _build_transform()(image).unsqueeze(0)

    with torch.inference_mode():
        logits = model(tensor)
        probabilities = torch.softmax(logits, dim=1)[0]
        idx = int(torch.argmax(probabilities).item())
        confidence = float(probabilities[idx].item()) * 100.0

    label = WOUND_LABELS[idx] if idx < len(WOUND_LABELS) else f"Class {idx + 1}"
    return {
        "available": True,
        "label": label,
        "confidence": round(confidence, 2),
    }
