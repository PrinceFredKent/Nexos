import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")

if not api_key:
    print("API Key not found.")
else:
    client = genai.Client(api_key=api_key)
    print("Listing available models...")
    try:
        for model in client.models.list():
            print(f"Model ID: {model.name}, Supported Actions: {model.supported_generation_methods}")
    except Exception as e:
        print(f"Error listing models: {e}")
