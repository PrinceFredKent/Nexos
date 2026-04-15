import re
from .ai_service import get_ai_medication_recommendation

async def get_medication_recommendation(name: str, age: int, weight_str: str):
    """
    Calculates medication dosage and frequency recommendations based on WHO/CDC guidelines.
    Uses AI fallback if hardcoded rules don't match.
    """
    name = name.lower()
    
    # Parse weight
    weight = 70 # Default adult weight
    if weight_str:
        weight_match = re.search(r'(\d+\.?\d*)', weight_str)
        if weight_match:
            weight = float(weight_match.group(1))

    # Hardcoded Rules (Fast & Accurate for Common Drugs)
    if any(x in name for x in ['paracetamol', 'panadol', 'tylenol']):
        if age >= 12:
            return {
                "dosage": "500mg - 1g",
                "frequency": "Three times daily",
                "explanation": "Standard adult dose: 4-6 hours interval."
            }
        else:
            dose_mg = weight * 15
            return {
                "dosage": f"{int(dose_mg)}mg",
                "frequency": "Three times daily",
                "explanation": "Pediatric dose calculated at 15mg/kg."
            }

    if any(x in name for x in ['ibuprofen', 'brufen', 'advil']):
        if age >= 12:
            return {
                "dosage": "400mg",
                "frequency": "Twice daily",
                "explanation": "Adult anti-inflammatory dose."
            }
        else:
            dose_mg = weight * 10
            return {
                "dosage": f"{int(dose_mg)}mg",
                "frequency": "Three times daily",
                "explanation": "Pediatric dose calculated at 10mg/kg."
            }

    if 'amoxicillin' in name:
        if age >= 12:
            return {
                "dosage": "500mg",
                "frequency": "Three times daily",
                "explanation": "Standard adult antibiotic course."
            }
        else:
            per_dose = (weight * 30) / 3
            return {
                "dosage": f"{int(per_dose)}mg",
                "frequency": "Three times daily",
                "explanation": "Pediatric dose: ~30mg/kg/day divided."
            }

    # If no hardcoded match, Use AI FALLBACK
    print(f"DEBUG: No hardcoded rule for {name}. Falling back to AI...")
    ai_rec = await get_ai_medication_recommendation(name, age, weight_str)
    if ai_rec:
        return ai_rec

    # Final Default fallback
    return {
        "dosage": "As prescribed",
        "frequency": "Once daily",
        "explanation": "No specific guidelines found. Consult your doctor."
    }
