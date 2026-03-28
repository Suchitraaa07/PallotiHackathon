
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import faiss
import json
import numpy as np

from fastapi.staticfiles import StaticFiles
from sentence_transformers import SentenceTransformer
from PIL import Image

app = FastAPI()

# Enable CORS so your React frontend can talk to this backend
# This is the "Key" that unlocks the door
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production use ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Load the Brain
print("⏳ Loading CLIP model and Index...")
model = SentenceTransformer('clip-ViT-B-32')
index = faiss.read_index("snake_index.faiss")

with open("metadata_final.json", "r") as f:
    metadata = json.load(f)
print("✅ Backend is ready!")

@app.get("/search")
async def search_snake(text: str = None, image_path: str = None):
    # If the user provides VOICE/TEXT
    if text:
        query_vector = model.encode([text])
    
    # If the user clicks "SIMILAR" (Visual Search)
    elif image_path:
        img = Image.open(image_path).convert('RGB')
        query_vector = model.encode([img])
    
    else:
        return {"error": "No query provided"}

    # Search top 4 matches
    distances, indices = index.search(np.array(query_vector).astype('float32'), k=4)
    
    results = []
    for i in indices[0]:
        results.append(metadata[i])
        
    return results


# This maps the URL "/images" to your actual folder on your Mac
app.mount("/images", StaticFiles(directory="/Users/swapnilvpotdar/Snakeuuuu/PallotiHackathon/images"), name="images")

# To run this: uvicorn main:app --reload
