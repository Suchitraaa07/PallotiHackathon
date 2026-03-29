from fastapi import APIRouter, Query

from app.services.flashcard_service import get_flashcards, get_similar_flashcards

router = APIRouter()


@router.get("/snake-flashcards")
def fetch_snake_flashcards(
    q: str | None = Query(default=None, description="Search by species/category/description"),
    category: str | None = Query(default=None, description="Category filter"),
    limit: int = Query(default=24, ge=1, le=120, description="Page size"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
):
    return get_flashcards(query=q, category=category, limit=limit, offset=offset)


@router.get("/snake-flashcards/similar")
def fetch_similar_snake_flashcards(
    q: str = Query(..., min_length=2, description="Natural language search query"),
    k: int = Query(default=4, ge=1, le=12, description="Top K similar cards"),
):
    return get_similar_flashcards(query=q, count=k)
