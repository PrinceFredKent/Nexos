import asyncio
import sys
import os

# Add the project root and backend to sys.path
sys.path.append(os.path.abspath(r"c:\xampp\htdocs\health\backend"))
sys.path.append(os.path.abspath(r"c:\xampp\htdocs\health\backend\services"))

from services.ai_service import get_suggested_symptoms

async def test():
    print("Testing 'Fever'...")
    res = await get_suggested_symptoms(["Fever"])
    print(f"Result: {res}")
    
    print("\nTesting 'Cough'...")
    res = await get_suggested_symptoms(["Cough"])
    print(f"Result: {res}")
    
    print("\nTesting empty...")
    res = await get_suggested_symptoms([])
    print(f"Result: {res}")

if __name__ == "__main__":
    asyncio.run(test())
