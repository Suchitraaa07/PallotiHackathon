# backend/app/nlp/symptom_extractor.py

from app.services.groq_client import get_client

SYMPTOMS = [
    "Swelling at bite site",
    "Severe pain",
    "Bleeding",
    "Nausea/Vomiting",
    "Difficulty breathing",
    "Numbness/Tingling",
    "Blurred vision",
    "Weakness/Fatigue",
]

def extract_symptoms_groq(text: str):
    client = get_client()

    prompt = f"""
You are a medical assistant.

A user describes symptoms after a snake bite in ANY language.

Your job:
- Understand the language
- Extract symptoms
- Map them ONLY to this list:

{SYMPTOMS}

Rules:
- Return ONLY a Python list
- No explanation
- No extra text
- Only items from the list

User input:
{text}
"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",  # fast + strong
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )

    output = response.choices[0].message.content.strip()

    try:
        # convert string → list safely
        symptoms = eval(output)
        if isinstance(symptoms, list):
            return symptoms
    except:
        pass

    return []