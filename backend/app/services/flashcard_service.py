import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import quote, unquote

DATA_CANDIDATES = (
    "metadata_local_server.json",
    "metadata_final.json",
    "enriched_metadata.json",
    "high_precision_metadata.json",
)
DEFAULT_LIMIT = 24
MAX_LIMIT = 120
DEFAULT_SIMILAR_COUNT = 4
MAX_SIMILAR_COUNT = 12
TOKEN_PATTERN = re.compile(r"[a-z0-9]+")
STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "was",
    "with",
    "which",
    "photo",
    "image",
}
TOKEN_NORMALIZATION = {
    "stripped": "striped",
    "stripes": "striped",
    "stripe": "striped",
    "colour": "color",
    "colored": "color",
    "venom": "venomous",
    "nonvenomous": "non",
    "non-venomous": "non",
}


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _backend_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _pick_metadata_file() -> Path | None:
    for file_name in DATA_CANDIDATES:
        candidate = _backend_root() / file_name
        if candidate.exists():
            return candidate
    return None


def _safe_text(value: Any, fallback: str = "") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text if text else fallback


def _tokenize(value: str) -> list[str]:
    lowered = unquote(value).lower()
    tokens = TOKEN_PATTERN.findall(lowered)
    normalized: list[str] = []
    for token in tokens:
        mapped = TOKEN_NORMALIZATION.get(token, token)
        if len(mapped) > 1 and mapped not in STOPWORDS:
            normalized.append(mapped)
    return normalized


def _normalize_local_image_url(image_path: str) -> str:
    if not image_path:
        return ""

    normalized_path = image_path.replace("\\", "/").lstrip("/")
    encoded_path = quote(normalized_path, safe="/%")
    return f"http://127.0.0.1:8000/{encoded_path}"


def _normalize_remote_image_url(image_url: str) -> str:
    if not image_url:
        return ""
    return quote(image_url, safe=":/?&=%#._-")


@lru_cache(maxsize=1)
def _load_cards_cached(metadata_file: str, modified_at: float) -> list[dict[str, Any]]:
    del modified_at
    path = Path(metadata_file)
    try:
        records = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []

    if not isinstance(records, list):
        return []

    cards: list[dict[str, Any]] = []
    for index, item in enumerate(records):
        if not isinstance(item, dict):
            continue

        image_path = _safe_text(item.get("image_path"))
        image_url = _safe_text(item.get("image_url")) or _safe_text(item.get("local_url"))
        image_url = _normalize_remote_image_url(image_url)
        if not image_url:
            image_url = _normalize_local_image_url(image_path)

        species = _safe_text(item.get("species"), "Unknown species")
        category = _safe_text(item.get("category"), "Unknown")
        description = _safe_text(
            item.get("description"),
            f"A {category.lower()} snake image.",
        )
        filename = _safe_text(item.get("filename"), f"image-{index + 1}.jpg")
        auto_tags = sorted(
            set(
                _tokenize(
                    " ".join(
                        [
                            species,
                            category,
                            description,
                            filename,
                            image_path,
                        ]
                    )
                )
            )
        )

        cards.append(
            {
                "id": f"{filename}-{index}",
                "species": species,
                "category": category,
                "description": description,
                "filename": filename,
                "image_url": image_url,
                "image_path": image_path,
                "auto_tags": auto_tags,
            }
        )

    return cards


def get_flashcards(
    query: str | None = None,
    category: str | None = None,
    limit: int = DEFAULT_LIMIT,
    offset: int = 0,
) -> dict[str, Any]:
    metadata_file = _pick_metadata_file()
    if metadata_file is None:
        return {
            "source": "",
            "total": 0,
            "count": 0,
            "items": [],
            "warning": "No metadata JSON file found in backend folder.",
        }

    constrained_limit = max(1, min(limit, MAX_LIMIT))
    constrained_offset = max(0, offset)
    all_cards = _load_cards_cached(
        str(metadata_file),
        metadata_file.stat().st_mtime,
    )

    filtered_cards = all_cards
    if query:
        query_text = query.strip().lower()
        filtered_cards = [
            card
            for card in filtered_cards
            if query_text in card["species"].lower()
            or query_text in card["category"].lower()
            or query_text in card["description"].lower()
            or query_text in card["filename"].lower()
        ]

    if category:
        category_text = category.strip().lower()
        filtered_cards = [
            card for card in filtered_cards if card["category"].lower() == category_text
        ]

    paginated_cards = filtered_cards[constrained_offset : constrained_offset + constrained_limit]
    return {
        "source": metadata_file.name,
        "total": len(filtered_cards),
        "count": len(paginated_cards),
        "items": paginated_cards,
    }


def _score_similarity(card: dict[str, Any], query_tokens: set[str], query_text: str) -> float:
    if not query_tokens:
        return 0.0

    species_tokens = set(_tokenize(str(card.get("species", ""))))
    category_tokens = set(_tokenize(str(card.get("category", ""))))
    description_tokens = set(_tokenize(str(card.get("description", ""))))
    filename_tokens = set(_tokenize(str(card.get("filename", ""))))
    path_tokens = set(_tokenize(str(card.get("image_path", ""))))
    auto_tags = set(card.get("auto_tags", []))

    field_scores = [
        (species_tokens, 0.30),
        (category_tokens, 0.10),
        (description_tokens, 0.30),
        (filename_tokens, 0.10),
        (path_tokens | auto_tags, 0.20),
    ]

    score = 0.0
    for tokens, weight in field_scores:
        if not tokens:
            continue
        overlap = len(tokens & query_tokens) / len(query_tokens)
        score += overlap * weight

    # Fuzzy bonus: allows near-miss terms like "stripped" vs "striped".
    fuzzy_hits = 0
    card_union_tokens = (
        species_tokens
        | category_tokens
        | description_tokens
        | filename_tokens
        | path_tokens
        | auto_tags
    )
    for query_token in query_tokens:
        if any(
            query_token in card_token
            or card_token in query_token
            for card_token in card_union_tokens
        ):
            fuzzy_hits += 1
    if fuzzy_hits:
        score += (fuzzy_hits / len(query_tokens)) * 0.2

    combined_text = " ".join(
        [
            str(card.get("species", "")),
            str(card.get("category", "")),
            str(card.get("description", "")),
            str(card.get("filename", "")),
            str(card.get("image_path", "")),
            " ".join(card.get("auto_tags", [])),
        ]
    ).lower()
    if query_text and query_text in combined_text:
        score += 0.15

    return round(min(score, 1.0), 4)


def get_similar_flashcards(query: str, count: int = DEFAULT_SIMILAR_COUNT) -> dict[str, Any]:
    metadata_file = _pick_metadata_file()
    if metadata_file is None:
        return {
            "source": "",
            "query": query,
            "count": 0,
            "items": [],
            "warning": "No metadata JSON file found in backend folder.",
        }

    k = max(1, min(count, MAX_SIMILAR_COUNT))
    all_cards = _load_cards_cached(
        str(metadata_file),
        metadata_file.stat().st_mtime,
    )

    query_text = query.strip().lower()
    query_tokens = set(_tokenize(query_text))
    if not query_tokens:
        return {
            "source": metadata_file.name,
            "query": query,
            "count": 0,
            "items": [],
            "warning": "Search query is empty.",
        }

    scored_cards: list[dict[str, Any]] = []
    for card in all_cards:
        score = _score_similarity(card, query_tokens, query_text)
        if score > 0:
            scored_cards.append({**card, "similarity_score": score})

    if not scored_cards:
        fallback = [{**card, "similarity_score": 0.05} for card in all_cards[:k]]
        return {
            "source": metadata_file.name,
            "query": query,
            "count": len(fallback),
            "items": fallback,
            "warning": "Showing best available cards for this description.",
        }

    ranked = sorted(
        scored_cards,
        key=lambda item: float(item.get("similarity_score", 0)),
        reverse=True,
    )[:k]

    return {
        "source": metadata_file.name,
        "query": query,
        "count": len(ranked),
        "items": ranked,
    }
