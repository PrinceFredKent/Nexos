import os
from dotenv import load_dotenv

# Test .env loading
load_dotenv()

gemini_key = os.environ.get("GEMINI_API_KEY")
openai_key = os.environ.get("OPENAI_API_KEY")

print(f"DEBUG: GEMINI_API_KEY found: {bool(gemini_key)}")
if gemini_key:
    print(f"DEBUG: GEMINI_API_KEY starts with: {gemini_key[:5]}")

print(f"DEBUG: OPENAI_API_KEY found: {bool(openai_key)}")
if openai_key:
    print(f"DEBUG: OPENAI_API_KEY starts with: {openai_key[:5]}")

try:
    import google.generativeai as genai
    print("DEBUG: google-generativeai is installed.")
except ImportError:
    print("DEBUG: google-generativeai NOT found.")

try:
    import openai
    print("DEBUG: openai is installed.")
except ImportError:
    print("DEBUG: openai NOT found.")
