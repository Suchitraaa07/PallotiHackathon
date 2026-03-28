# backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import riskcheck as report
from app.routes import vision
from app.routes import nlp

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv():
        return False


load_dotenv()

app = FastAPI()
app.include_router(nlp.router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(report.router, prefix="/api")
app.include_router(vision.router, prefix="/api")


@app.get("/")
def home():
    return {"message": "Backend running"}
