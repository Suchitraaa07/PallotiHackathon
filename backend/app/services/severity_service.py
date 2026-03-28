# backend/app/services/severity_service.py

WEIGHTS = {
    "Swelling at bite site": 2,
    "Severe pain": 3,
    "Bleeding": 4,
    "Nausea/Vomiting": 2,
    "Difficulty breathing": 5,
    "Numbness/Tingling": 3,
    "Blurred vision": 3,
    "Weakness/Fatigue": 2,
}

def calculate_severity(symptoms):
    score = sum(WEIGHTS.get(s, 0) for s in symptoms)

    if score <= 4:
        return "Low - Monitor symptoms and seek medical advice if they worsen"
    elif score <= 10:
        return "Medium - Monitor closely and seek medical advice"
    else:
        return "High - VISIT HOSPITAL IMMEDIATELY"