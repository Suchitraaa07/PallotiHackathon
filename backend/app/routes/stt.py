from fastapi import APIRouter, File, UploadFile

from app.services.stt_groq_service import transcribe_audio_with_groq
from app.services.stt_service import transcribe_wav_audio

router = APIRouter()


@router.post("/stt-vosk")
async def stt_vosk(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    transcript = transcribe_wav_audio(audio_bytes)
    return {"text": transcript}


@router.post("/stt-groq")
async def stt_groq(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    transcript = transcribe_audio_with_groq(
        audio_bytes=audio_bytes,
        filename=file.filename or "audio.wav",
        content_type=file.content_type or "audio/wav",
    )
    return {"text": transcript}
