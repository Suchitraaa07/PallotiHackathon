from groq import Groq
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv():
        return False

load_dotenv() 

client = None


def _read_env_file_var(var_name: str) -> str:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return ""

    try:
        for line in env_path.read_text(encoding="utf-8").splitlines():
            cleaned = line.strip()
            if not cleaned or cleaned.startswith("#") or "=" not in cleaned:
                continue

            key, value = cleaned.split("=", 1)
            if key.strip() == var_name:
                return value.strip().strip('"').strip("'")
    except OSError:
        return ""

    return ""


def _resolve_groq_api_key() -> str:
    return os.getenv("GROQ_API_KEY", "") or _read_env_file_var("GROQ_API_KEY")

def get_client():
    global client
    if client is None:
        api_key = _resolve_groq_api_key()
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not configured.")
        client = Groq(api_key=api_key)
    return client
