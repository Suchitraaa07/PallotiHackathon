from __future__ import annotations

import json
import os
import wave
from functools import lru_cache
from io import BytesIO
from pathlib import Path

from fastapi import HTTPException

try:
    from vosk import KaldiRecognizer, Model, SetLogLevel
    SetLogLevel(-1)
    _VOSK_IMPORT_ERROR: Exception | None = None
except Exception as exc:  # pragma: no cover - environment dependent
    KaldiRecognizer = None  # type: ignore[assignment]
    Model = None  # type: ignore[assignment]
    _VOSK_IMPORT_ERROR = exc


def _default_model_path() -> Path:
    return Path(__file__).resolve().parents[2] / "models" / "vosk-model-small-en-us-0.15"


@lru_cache(maxsize=1)
def _load_vosk_model() -> Model:
    if _VOSK_IMPORT_ERROR is not None or Model is None:
        raise HTTPException(
            status_code=500,
            detail="Vosk is not installed. Run: pip install vosk",
        )

    configured_path = os.getenv("VOSK_MODEL_PATH", "").strip()
    model_path = Path(configured_path) if configured_path else _default_model_path()
    if not model_path.exists():
        raise HTTPException(
            status_code=500,
            detail=(
                "Vosk model not found. Set VOSK_MODEL_PATH or place model at "
                f"{model_path}"
            ),
        )
    return Model(str(model_path))


def transcribe_wav_audio(audio_bytes: bytes) -> str:
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty.")

    try:
        with wave.open(BytesIO(audio_bytes), "rb") as wav_file:
            channels = wav_file.getnchannels()
            sample_width = wav_file.getsampwidth()
            sample_rate = wav_file.getframerate()
            compression = wav_file.getcomptype()

            if channels != 1 or sample_width != 2 or compression != "NONE":
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "Audio must be mono PCM WAV (16-bit). "
                        "Please record in supported format."
                    ),
                )

            recognizer = KaldiRecognizer(_load_vosk_model(), sample_rate)
            text_parts: list[str] = []
            while True:
                frame_data = wav_file.readframes(4000)
                if not frame_data:
                    break
                if recognizer.AcceptWaveform(frame_data):
                    partial = json.loads(recognizer.Result()).get("text", "").strip()
                    if partial:
                        text_parts.append(partial)

            final_text = json.loads(recognizer.FinalResult()).get("text", "").strip()
            if final_text:
                text_parts.append(final_text)
    except HTTPException:
        raise
    except wave.Error as exc:
        raise HTTPException(status_code=422, detail=f"Invalid WAV audio: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Vosk transcription failed: {exc}") from exc

    transcript = " ".join(part.strip() for part in text_parts if part.strip()).strip()
    if not transcript:
        raise HTTPException(status_code=422, detail="Could not transcribe speech.")
    return transcript
