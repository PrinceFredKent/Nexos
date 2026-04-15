import asyncio
import sys
import os

# Add the parent directory to sys.path to import services
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ai_service import get_symptom_analysis

async def test():
    # User's reported case
    symptoms = ["Headache", "Fatigue", "Weakness"]
    print(f"Testing symptoms: {symptoms}")
    
    result = await get_symptom_analysis(symptoms)
    
    print("\n--- Results ---")
    print(f"Status: {result['status']}")
    print(f"Top Condition: {result['top_condition']}")
    
    # Expected: Dehydration or Anemia (since no Fever/Chills for Malaria)
    if result['top_condition'] in ["Dehydration", "Iron Deficiency / Anemia"]:
        print(f"\n✅ SUCCESS: Logic correctly prioritized {result['top_condition']} over Malaria.")
    else:
        print(f"\n❌ FAILURE: Unexpected top condition '{result['top_condition']}'.")

if __name__ == "__main__":
    asyncio.run(test())
