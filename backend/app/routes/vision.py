from fastapi import APIRouter, File, UploadFile

from app.services.vision_service import analyze_uploaded_image

router = APIRouter()


@router.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    return await analyze_uploaded_image(file)
