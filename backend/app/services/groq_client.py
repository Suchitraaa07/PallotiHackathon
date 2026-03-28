from groq import Groq
import os

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv():
        return False

load_dotenv() 

api_key = os.getenv("GROQ_API_KEY")
client = None

def get_client():
    global client
    if client is None:
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not configured.")
        client = Groq(api_key=api_key)
    return client
