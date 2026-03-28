# backend/app/routes/nlp.py

from fastapi import APIRouter
from pydantic import BaseModel
from app.nlp.symptom_extractor import extract_symptoms_groq

router = APIRouter()

class VoiceInput(BaseModel):
    text: str

@router.post("/extract")
def extract_symptoms(data: VoiceInput):
    symptoms = extract_symptoms_groq(data.text)

    return {
        "symptoms": symptoms
    }