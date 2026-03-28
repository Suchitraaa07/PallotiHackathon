
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from app.services.severity_service import calculate_severity

router = APIRouter()

class SymptomInput(BaseModel):
    symptoms: List[str]

@router.post("/severity")
def get_severity(data: SymptomInput):
    severity = calculate_severity(data.symptoms)

    return {
        "severity": severity,
        "selected_symptoms": data.symptoms
    }