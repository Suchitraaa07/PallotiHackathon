from __future__ import annotations

import io
import os

from fastapi import HTTPException

from app.services.groq_client import get_client


def _normalize_filename(filename: str, content_type: str) -> str:
    cleaned = (filename or "").strip() or "audio"
    lower = cleaned.lower()
    if lower.endswith((".wav", ".mp3", ".m4a", ".ogg", ".webm", ".mp4", ".mpeg", ".mpga")):
        return cleaned

    content = (content_type or "").lower()
    if "ogg" in content:
        return f"{cleaned}.ogg"
    if "webm" in content:
        return f"{cleaned}.webm"
    if "mp3" in content:
        return f"{cleaned}.mp3"
    if "m4a" in content:
        return f"{cleaned}.m4a"
    if "mp4" in content:
        return f"{cleaned}.mp4"
    return f"{cleaned}.wav"


def transcribe_audio_with_groq(
    audio_bytes: bytes,
    filename: str = "audio.wav",
    content_type: str = "audio/wav",
) -> str:
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty.")

    model_name = os.getenv("GROQ_STT_MODEL", "whisper-large-v3")
    language = os.getenv("GROQ_STT_LANGUAGE")
    prompt = os.getenv(
        "GROQ_STT_PROMPT",
        "Transcribe clearly. Domain includes snake names, symptoms, and emergency terms.",
    )
    safe_filename = _normalize_filename(filename, content_type)
    request_payload = {
        "model": model_name,
        "temperature": 0,
        "prompt": prompt,
        "response_format": "json",
    }
    if language:
        request_payload["language"] = language

    errors: list[str] = []
    try:
        client = get_client()
        response = None
        upload_variants = [
            (safe_filename, audio_bytes),
            (safe_filename, io.BytesIO(audio_bytes)),
        ]

        for upload_file in upload_variants:
            try:
                response = client.audio.transcriptions.create(
                    file=upload_file,
                    **request_payload,
                )
                break
            except Exception as variant_exc:
                errors.append(str(variant_exc))

        if response is None:
            raise RuntimeError(errors[0] if errors else "Groq STT upload failed.")
        transcript = str(getattr(response, "text", "") or "").strip()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Groq STT failed: {exc}") from exc

    if not transcript:
        raise HTTPException(status_code=422, detail="Could not transcribe speech.")
    return transcript
