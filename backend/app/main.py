from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routes import flashcards
from app.routes import nlp
from app.routes import riskcheck as report
from app.routes import stt
from app.routes import vision

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv():
        return False


load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nlp.router, prefix="/api")
app.include_router(report.router, prefix="/api")
app.include_router(vision.router, prefix="/api")
app.include_router(flashcards.router, prefix="/api")
app.include_router(stt.router, prefix="/api")

project_root = Path(__file__).resolve().parents[2]
images_dir = project_root / "images"
if images_dir.exists():
    app.mount("/images", StaticFiles(directory=str(images_dir)), name="images")


@app.get("/")
def home():
    return {"message": "Backend running"}
