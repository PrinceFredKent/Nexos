import json
import os
import asyncio
from typing import List, Dict
from dotenv import load_dotenv

# Load API keys from .env if present
load_dotenv()

# High risk keywords for Local Model (Step 1)
HIGH_RISK_KEYWORDS = [
    "chest pain", "shortness of breath", "difficulty breathing", 
    "severe bleeding", "unconscious", "stroke", "heart attack",
    "paralysis", "sudden weakness", "severe head injury", "blue lips"
]

def analyze_local_risk(symptoms: List[str]) -> str:
    """Step 1: Local Model Keyword Detection for Risk Level"""
    symptoms_text = " ".join(symptoms).lower()
    for keyword in HIGH_RISK_KEYWORDS:
        if keyword in symptoms_text:
            return "High"
    
    # Check for stroke or heart attack clusters
    if "sudden weakness" in symptoms_text or "slurred speech" in symptoms_text:
        return "High"
    if "chest pain" in symptoms_text and ("shortness of breath" in symptoms_text or "pain in arm" in symptoms_text):
        return "High"
        
    return "Medium"

LOCAL_CONDITION_REGISTRY = {
    "Malaria": {
        "symptoms": ["Fever", "Chills", "Sweating", "Headache", "Body aches", "Nausea", "Vomiting", "Fatigue", "Weakness"],
        "explanation": "Your symptoms pattern is strongly suggestive of Malaria, which is highly prevalent in tropical regions like Uganda.",
        "action_steps": ["Visit the nearest lab for a Malaria test (RDT or Microscopy)", "Consult a healthcare worker at a hospital or similar for medication", "Rest and take plenty of fluids"],
        "is_emergency": False,
        "required_any": ["Fever", "Chills"]
    },
    "Typhoid Fever": {
        "symptoms": ["Fever", "Prolonged fever", "Abdominal pain", "Weakness", "Loss of appetite", "Constipation", "Diarrhea"],
        "explanation": "These symptoms could indicate Typhoid Fever, common in areas with shared water sources.",
        "action_steps": ["Seek a blood culture or Widal test", "Complete a full course of prescribed antibiotics", "Ensure you drink boiled or treated water"],
        "is_emergency": False,
        "required_any": ["Fever", "Prolonged fever"]
    },
    "Tuberculosis (TB)": {
        "symptoms": ["Persistent cough", "Cough", "Chest pain", "Weight loss", "Night sweats", "Fever"],
        "explanation": "A persistent cough combined with night sweats and weight loss is a classic indicator for TB.",
        "action_steps": ["Visit a TB screening center immediately for a sputum test", "A Chest X-ray may be required for confirmation", "Avoid close contact with others until cleared by a medic"],
        "is_emergency": False,
        "required_any": ["Persistent cough", "Cough", "Night sweats"]
    },
    "Hypertension": {
        "symptoms": ["Headache", "Dizziness", "Blurred vision"],
        "explanation": "Your symptoms might be caused by significantly elevated blood pressure.",
        "action_steps": ["Check your blood pressure at the nearest clinic", "Reduce salt intake and avoid strenuous activity for now", "Consult a doctor for long-term pressure management"],
        "is_emergency": False
    },
    "Heart Attack": {
        "symptoms": ["Chest pain", "Shortness of breath", "Pain in arm", "Pain in jaw", "Sweating"],
        "explanation": "CRITICAL: These symptoms are strong indicators of a possible heart attack.",
        "action_steps": ["CALL EMERGENCY SERVICES IMMEDIATELY", "Do not attempt to drive yourself to the hospital", "If advised by emergency staff, chew 300mg of Aspirin"],
        "is_emergency": True
    },
    "Pneumonia": {
        "symptoms": ["Cough", "Fever", "Difficulty breathing", "Chest pain"],
        "explanation": "The combination of fever and difficulty breathing suggests a potential lung infection like Pneumonia.",
        "action_steps": ["Consult a doctor for a chest examination and possible X-ray", "Antibiotics may be necessary if bacterial", "Monitor your breathing closely"],
        "is_emergency": False,
        "required_any": ["Fever", "Difficulty breathing"]
    },
    "Asthma": {
        "symptoms": ["Wheezing", "Shortness of breath", "Chest tightness"],
        "explanation": "Wheezing and chest tightness are hallmark signs of an asthma attack or flare-up.",
        "action_steps": ["Use a rescue inhaler if you have one", "Move to an area with fresh air and sit upright", "Seek emergency care if breathing continues to be difficult"],
        "is_emergency": False
    },
    "Peptic Ulcer": {
        "symptoms": ["Burning stomach pain", "Bloating", "Nausea"],
        "explanation": "Burning pain in the upper abdomen often points to peptic ulcer disease.",
        "action_steps": ["Avoid spicy foods, caffeine, and NSAIDs like Ibuprofen", "Consult a doctor about H. pylori testing", "Antacids may provide temporary relief"],
        "is_emergency": False
    },
    "Food Poisoning": {
        "symptoms": ["Diarrhea", "Vomiting", "Abdominal cramps", "Nausea"],
        "explanation": "Rapid onset of vomiting and cramps is typical of foodborne illness.",
        "action_steps": ["Take Oral Rehydration Salts (ORS) to stay hydrated", "Seek medical help if you see blood in stool or have high fever", "Rest your stomach with bland foods initially"],
        "is_emergency": False
    },
    "Migraine": {
        "symptoms": ["Severe headache", "Headache", "Sensitivity to light", "Nausea"],
        "explanation": "Severe throbbing pain with light sensitivity is typical of a Migraine.",
        "action_steps": ["Rest in a dark, quiet room", "Apply a cold compress to your head", "Take prescribed migraine relief as soon as possible"],
        "is_emergency": False
    },
    "Stroke": {
        "symptoms": ["Sudden weakness", "Slurred speech", "Confusion", "Vision problems"],
        "explanation": "CRITICAL: These sudden neurological changes are indicators of a possible stroke.",
        "action_steps": ["CALL EMERGENCY SERVICES IMMEDIATELY", "Think FAST: Face, Arms, Speech, Time to call", "Note the exact time symptoms started"],
        "is_emergency": True
    },
    "Diabetes": {
        "symptoms": ["Frequent urination", "Excess thirst", "Fatigue", "Blurred vision"],
        "explanation": "Classic symptoms of high blood sugar (Hyperglycemia) often found in Diabetes.",
        "action_steps": ["Get a fasting blood sugar or HbA1c test", "Consult a doctor for a management plan", "Maintain a consistent and healthy diet"],
        "is_emergency": False
    },
    "Anxiety": {
        "symptoms": ["Restlessness", "Rapid heartbeat", "Sweating"],
        "explanation": "Physical symptoms like rapid heartbeat and restlessness are often tied to anxiety levels.",
        "action_steps": ["Practice deep abdominal breathing", "Address potential stressors or seek counseling", "Limit stimulants like caffeine"],
        "is_emergency": False
    },
    "Depression": {
        "symptoms": ["Persistent sadness", "Loss of interest", "Fatigue"],
        "explanation": "A period of persistent low mood and loss of interest is indicative of Clinical Depression.",
        "action_steps": ["Reach out to a mental health professional", "Speak with a trusted friend or family member", "Seek immediate help if you have thoughts of self-harm"],
        "is_emergency": False
    },
    "Dehydration": {
        "symptoms": ["Headache", "Fatigue", "Weakness", "Dizziness", "Excess thirst", "Dry mouth"],
        "explanation": "Common when the body loses more fluid than it takes in, often during hot weather or illness.",
        "action_steps": ["Drink plenty of water or ORS", "Rest in a cool, shaded area", "Monitor urine color; it should be pale yellow"],
        "is_emergency": False
    },
    "Iron Deficiency / Anemia": {
        "symptoms": ["Fatigue", "Weakness", "Dizziness", "Shortness of breath", "Headache"],
        "explanation": "A condition in which you lack enough healthy red blood cells to carry adequate oxygen to your body's tissues.",
        "action_steps": ["Eat iron-rich foods like liver, beans, and greens", "Consider an iron supplement after consulting a doctor", "Get a Complete Blood Count (CBC) test"],
        "is_emergency": False
    },
    "Dysmenorrhea (Period Cramps)": {
        "symptoms": ["Abdominal cramps", "Cramps", "Lower back pain", "Nausea", "Headache", "Fatigue", "Diarrhea"],
        "explanation": "Dysmenorrhea refers to painful menstrual cramps that occur before or during a menstrual period. This is very common and often manageable with pain relief and rest.",
        "action_steps": ["Take a mild pain reliever like Ibuprofen or Paracetamol as directed", "Apply a warm compress or heating pad to the lower abdomen", "Light exercise like walking can help reduce cramping", "Consult a gynecologist if pain is severe or worsening each cycle"],
        "is_emergency": False,
        "female_only": True,
        "required_any": ["Abdominal cramps", "Cramps", "Lower back pain"]
    },
    "PMS (Premenstrual Syndrome)": {
        "symptoms": ["Mood swings", "Bloating", "Breast tenderness", "Fatigue", "Irritability", "Headache", "Food cravings", "Anxiety"],
        "explanation": "Premenstrual Syndrome (PMS) is a group of physical and emotional symptoms that typically occur 1-2 weeks before a period begins. Symptoms usually improve once menstruation starts.",
        "action_steps": ["Maintain a regular sleep schedule and reduce caffeine and salt intake", "Engage in regular aerobic exercise to help balance hormone levels", "Track your cycle to anticipate PMS days and plan self-care", "See a doctor if PMS significantly impacts daily life — hormonal treatments may help"],
        "is_emergency": False,
        "female_only": True,
        "required_any": ["Mood swings", "Breast tenderness", "Bloating"]
    },
    "PCOS (Polycystic Ovary Syndrome)": {
        "symptoms": ["Irregular periods", "Weight gain", "Fatigue", "Acne", "Excess hair growth", "Hair thinning", "Mood swings", "Difficulty getting pregnant"],
        "explanation": "PCOS is a hormonal disorder common among women of reproductive age, causing irregular periods and elevated androgen levels. Early diagnosis and management can prevent long-term complications.",
        "action_steps": ["Consult a gynecologist or endocrinologist for a proper PCOS diagnosis (ultrasound + blood tests)", "Maintain a healthy weight through balanced diet and regular exercise", "Discuss hormonal birth control or Metformin with your doctor if prescribed", "Monitor blood sugar levels as PCOS increases risk of Type 2 Diabetes"],
        "is_emergency": False,
        "female_only": True,
        "required_any": ["Irregular periods", "Weight gain"]
    }
}

def refined_local_analysis(user_symptoms: List[str]) -> Dict:
    """Algorithm to match symptoms to localized conditions with priority weighting."""
    scores = []
    user_symptoms_lower = [s.lower() for s in user_symptoms]
    
    for condition, data in LOCAL_CONDITION_REGISTRY.items():
        # Clean current symptoms and registry symptoms
        registry_symptoms_lower = [s.lower() for s in data["symptoms"]]
        
        # Calculate Overlap
        matches = [s for s in user_symptoms_lower if s in registry_symptoms_lower]
        match_count = len(matches)
        
        if match_count > 0:
            # Calculate match percentage based on the SPECIFIC condition's symptoms
            # If a user has 3 symptoms of 'Malaria' (out of 7), that's relevant.
            percentage = int((match_count / len(data["symptoms"])) * 100)
            
            # Weighted Score: base count + emergency weight + percentage bonus
            score = match_count * 10 # Base importance
            
            # Indicator Check: Penalize if a required indicator is missing
            required = data.get("required_any")
            if required:
                has_indicator = any(ind.lower() in user_symptoms_lower for ind in required)
                if not has_indicator:
                    score = score * 0.4 # Heavy penalty for missing core indicators
            
            if data["is_emergency"]: score += 15 # Emergency priority
            if match_count >= 3: score += 5 # Cluster bonus
            
            scores.append({
                "condition": condition,
                "score": score,
                "percentage": percentage,
                "data": data
            })
            
    # Sort by score descending
    scores.sort(key=lambda x: x["score"], reverse=True)
    
    if not scores:
        return None
        
    return scores

async def call_gemini_analysis(symptoms: List[str], risk_level: str, cycle_context: str = None) -> Dict:
    """[TEMPORARILY DISABLED] Single Gemini call for both diagnosis and formatting."""
    print("DEBUG: Gemini Analysis is temporarily disabled. Using local logic.")
    return None

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None

    cycle_section = ""
    if cycle_context:
        cycle_section = f"""

IMPORTANT FEMALE HEALTH CONTEXT:
The patient is female. {cycle_context}
Please factor this menstrual cycle context into your analysis. Consider conditions such as Dysmenorrhea, PMS, or hormonal fluctuations if clinically relevant to the reported symptoms.
"""

    prompt = f"""
You are a global health assistant based strictly on CDC and WHO clinical guidelines. 
Your goal is to provide evidence-based information, prioritize emergency screening (triage), 
and remain culturally neutral. Do not provide local folk remedies; stick to peer-reviewed 
medical standards. Always include a disclaimer that you are an AI, not a doctor.
{cycle_section}
A patient reports the following symptoms: {', '.join(symptoms)}.
The assessed risk level is: {risk_level}.

Return ONLY a valid JSON object (no markdown) with this exact structure:
{{
  "possibilities": [
    {{"condition": "Most likely condition", "match_percentage": 85}},
    {{"condition": "Second possibility", "match_percentage": 55}},
    {{"condition": "Third possibility", "match_percentage": 30}}
  ],
  "explanation": "A clear 1-2 sentence explanation based on WHO/CDC standards.",
  "safe_wording": "MANDATORY: I am an AI health assistant, not a doctor. This analysis is for informational purposes.",
  "action_steps": [
    "First evidence-based action",
    "Second evidence-based action",
    "Third evidence-based action"
  ]
}}
    """

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        model_name = 'models/gemini-2.5-flash'

        print(f"DEBUG: Calling Gemini ({model_name}) with symptoms: {symptoms}")
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=model_name,
            contents=prompt
        )
        text = response.text.strip()
        print(f"DEBUG: Gemini raw response: {text[:200]}...")

        # Strip markdown fences if present
        if "```json" in text:
            text = text.split("```json")[-1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        return json.loads(text)
    except Exception as e:
        error_msg = str(e)
        if "503" in error_msg or "Service Unavailable" in error_msg:
            print("⚠️ Gemini is busy (503). Switching to Local Ugandan Analysis...")
        elif "429" in error_msg or "Quota" in error_msg:
            print("⚠️ Gemini Rate Limit (429). Switching to Local Ugandan Analysis...")
        else:
            print(f"Gemini Analysis Error: {type(e).__name__} - {error_msg}")
        return None


async def get_symptom_analysis(user_symptoms: List[str], cycle_context: str = None):
    """Resilient Pipeline: Gemini 2.5 Flash -> Local Ugandan-Context Fallback."""
    if not user_symptoms:
        return {"status": "Empty", "results": "Please select symptoms."}

    # Step 1: Local Risk Assessment
    risk_level = analyze_local_risk(user_symptoms)

    # Step 2: [TEMPORARILY DISABLED] Single Gemini 2.5 Flash call for full analysis
    # gemini_result = await call_gemini_analysis(user_symptoms, risk_level, cycle_context=cycle_context)
    gemini_result = None # Force local fallback

    # If Gemini succeeded, return the rich AI response
    if gemini_result and gemini_result.get("possibilities"):
        return {
            "status": "Success",
            "risk_level": risk_level,
            "top_condition": gemini_result["possibilities"][0]["condition"],
            "explanation": gemini_result.get("explanation"),
            "safe_wording": gemini_result.get("safe_wording"),
            "action_steps": gemini_result.get("action_steps", []),
            "possibilities": gemini_result["possibilities"]
        }

    # Step 3: Local Ugandan-Context Fallback if Gemini is unavailable
    print("Gemini unavailable. Falling back to Local Ugandan-Context Analysis.")
    local_results = refined_local_analysis(user_symptoms)

    if not local_results:
        return {
            "status": "Success",
            "risk_level": risk_level,
            "top_condition": "Non-specific Viral Syndrome",
            "explanation": "Your symptoms are common across various mild illnesses and require further observation.",
            "safe_wording": "⚠️ This is a local assessment only. Please consult a healthcare professional.",
            "action_steps": ["Monitor your symptoms closely", "Stay hydrated and rest", "Seek medical advice if symptoms worsen"],
            "possibilities": [
                {"condition": "Non-specific Viral Syndrome", "match_percentage": 50},
                {"condition": "General Health Concern", "match_percentage": 30}
            ]
        }

    top = local_results[0]
    second = local_results[1] if len(local_results) > 1 else None

    return {
        "status": "Success",
        "risk_level": risk_level,
        "top_condition": top["condition"],
        "explanation": top["data"]["explanation"],
        "safe_wording": "⚠️ AI Analysis is currently operating in regional optimization mode. Please consult a professional for critical concerns.",
        "action_steps": top["data"]["action_steps"],
        "possibilities": [
            {
                "condition": top["condition"], 
                "match_percentage": top["percentage"],
                "explanation": top["data"]["explanation"],
                "action_steps": top["data"]["action_steps"]
            },
            {
                "condition": second["condition"], 
                "match_percentage": second["percentage"],
                "explanation": second["data"]["explanation"],
                "action_steps": second["data"]["action_steps"]
            } if second else {
                "condition": "General Health Concern", 
                "match_percentage": 20,
                "explanation": "Your symptoms are general and could be related to various minor conditions.",
                "action_steps": ["Rest", "Stay hydrated"]
            }
        ]
    }

# Local Symptom Mapping for instant suggestions (Comprehensive)
SYMPTOM_RELATIONS = {
    # Infectious Diseases
    'Fever': ['Chills', 'Sweating', 'Headache', 'Body Aches', 'Nausea', 'Vomiting', 'Weakness', 'Night Sweats'],
    'Chills': ['Fever', 'Sweating', 'Body Aches', 'Shivering', 'Fatigue'],
    'Sweating': ['Fever', 'Chills', 'Nausea', 'Restlessness', 'Chest Pain'],
    'Headache': ['Dizziness', 'Blurred Vision', 'Nausea', 'Sensitivity to Light', 'Fatigue', 'Confusion'],
    'Body Aches': ['Fever', 'Chills', 'Fatigue', 'Weakness', 'Joint Pain'],
    'Nausea': ['Vomiting', 'Stomach Pain', 'Loss of Appetite', 'Dizziness', 'Bloating'],
    'Vomiting': ['Nausea', 'Diarrhea', 'Abdominal Cramps', 'Dizziness', 'Weakness'],
    'Abdominal Pain': ['Nausea', 'Vomiting', 'Loss of Appetite', 'Constipation', 'Diarrhea', 'Bloating'],
    'Weakness': ['Fatigue', 'Fever', 'Dizziness', 'Loss of Appetite', 'Sudden Weakness'],
    'Loss of Appetite': ['Nausea', 'Abdominal Pain', 'Weakness', 'Weight Loss'],
    'Constipation': ['Abdominal Pain', 'Bloating', 'Nausea'],
    'Diarrhea': ['Vomiting', 'Abdominal Cramps', 'Dehydration', 'Fever'],
    'Cough': ['Chest Pain', 'Shortness of Breath', 'Fever', 'Sore Throat', 'Congestion', 'Night Sweats'],
    'Chest Pain': ['Shortness of Breath', 'Sweating', 'Pain in Arm', 'Pain in Jaw', 'Cough', 'Wheezing'],
    'Weight Loss': ['Persistent Cough', 'Night Sweats', 'Loss of Appetite', 'Fatigue'],
    'Night Sweats': ['Fever', 'Persistent Cough', 'Weight Loss', 'Fatigue'],
    
    # Cardiovascular
    'Dizziness': ['Headache', 'Blurred Vision', 'Nausea', 'Lightheadedness', 'Fainting'],
    'Blurred Vision': ['Headache', 'Dizziness', 'Frequent Urination', 'Excess Thirst'],
    'Shortness of Breath': ['Chest Pain', 'Sweating', 'Wheezing', 'Chest Tightness', 'Cough'],
    
    # Respiratory
    'Difficulty Breathing': ['Cough', 'Fever', 'Chest Pain', 'Wheezing', 'Shortness of Breath'],
    'Wheezing': ['Shortness of Breath', 'Chest Tightness', 'Cough', 'Difficulty Breathing'],
    'Chest Tightness': ['Wheezing', 'Shortness of Breath', 'Chest Pain', 'Cough'],
    
    # Gastrointestinal
    'Burning Stomach Pain': ['Bloating', 'Nausea', 'Heartburn'],
    'Bloating': ['Burning Stomach Pain', 'Nausea', 'Abdominal Pain', 'Constipation'],
    'Abdominal Cramps': ['Diarrhea', 'Vomiting', 'Fever', 'Nausea'],
    
    # Neurological
    'Severe Headache': ['Sensitivity to Light', 'Nausea', 'Blurred Vision', 'Dizziness'],
    'Sensitivity to Light': ['Severe Headache', 'Nausea', 'Dizziness'],
    'Sudden Weakness': ['Slurred Speech', 'Confusion', 'Vision Problems', 'Numbness'],
    'Slurred Speech': ['Sudden Weakness', 'Confusion', 'Vision Problems', 'Dizziness'],
    'Confusion': ['Sudden Weakness', 'Slurred Speech', 'Vision Problems', 'Memory Loss'],
    'Vision Problems': ['Sudden Weakness', 'Slurred Speech', 'Confusion', 'Headache'],
    
    # Metabolic
    'Frequent Urination': ['Excess Thirst', 'Fatigue', 'Blurred Vision', 'Weight Loss'],
    'Excess Thirst': ['Frequent Urination', 'Fatigue', 'Blurred Vision', 'Dry Mouth'],
    'Fatigue': ['Weakness', 'Fever', 'Aching', 'Blurred Vision', 'Frequent Urination', 'Sadness'],
    
    # Mental Health
    'Restlessness': ['Rapid Heartbeat', 'Sweating', 'Anxiety', 'Insomnia'],
    'Rapid Heartbeat': ['Restlessness', 'Sweating', 'Chest Pain', 'Anxiety'],
    'Persistent Sadness': ['Loss of Interest', 'Fatigue', 'Sleep Problems', 'Crying'],
    'Loss of Interest': ['Persistent Sadness', 'Fatigue', 'Social Withdrawal'],

    # Female / Menstrual Health
    'Cramps': ['Lower Back Pain', 'Abdominal Pain', 'Nausea', 'Fatigue', 'Diarrhea', 'Headache'],
    'Lower Back Pain': ['Cramps', 'Abdominal Pain', 'Fatigue'],
    'Breast Tenderness': ['Bloating', 'Mood Swings', 'Fatigue', 'Headache'],
    'Mood Swings': ['Irritability', 'Fatigue', 'Breast Tenderness', 'Bloating', 'Anxiety'],
    'Irritability': ['Mood Swings', 'Fatigue', 'Restlessness', 'Headache'],
    'Food Cravings': ['Bloating', 'Nausea', 'Mood Swings'],
    'Irregular Periods': ['Fatigue', 'Weight Gain', 'Acne', 'Mood Swings'],
    'Acne': ['Irregular Periods', 'Fatigue', 'Excess Hair Growth'],
    'Excess Hair Growth': ['Irregular Periods', 'Acne', 'Weight Gain']
}

async def get_suggested_symptoms(current_symptoms: List[str]) -> List[str]:
    """Provides instant symptom suggestions based on a local mapping."""
    # Default set of symptoms if nothing matches or nothing selected
    DEFAULT_SUGGESTIONS = [
        'Headache', 'Fever', 'Fatigue', 'Cough', 'Nausea', 'Aching', 
        'Dizziness', 'Sore Throat', 'Chest Pain', 'Shortness of Breath'
    ]
    
    if not current_symptoms:
        return DEFAULT_SUGGESTIONS[:8]
        
    suggested_set = set()
    for symptom in current_symptoms:
        # Check for case-insensitive matches in our mapping
        matched = False
        for key, relates in SYMPTOM_RELATIONS.items():
            if key.lower() == symptom.lower():
                suggested_set.update(relates)
                matched = True
                break
        
        # If no specific mapping, just add some defaults to keep the grid full
        if not matched:
            suggested_set.update(DEFAULT_SUGGESTIONS[:3])

    # Filter out already selected symptoms
    final_suggestions = [s for s in suggested_set if s.lower() not in [cs.lower() for cs in current_symptoms]]
    
    # If we have too few suggestions, pad with defaults
    if len(final_suggestions) < 6:
        for ds in DEFAULT_SUGGESTIONS:
            if ds.lower() not in [cs.lower() for cs in current_symptoms] and ds not in final_suggestions:
                final_suggestions.append(ds)
            if len(final_suggestions) >= 8:
                break

    return final_suggestions[:10]

async def get_ai_medication_recommendation(name: str, age: int, weight: str) -> Dict:
    """[TEMPORARILY DISABLED] Uses Gemini to provide medication dosage and frequency recommendations."""
    print("DEBUG: AI Medication Recommendation is temporarily disabled.")
    return None

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None

    prompt = f"""
    You are a clinical pharmacist assistant based on WHO and international medical guidelines.
    Provide a recommended dosage and frequency for the following medication request:
    - Medication: {name}
    - Patient Age: {age} years
    - Patient Weight: {weight}

    Return ONLY a valid JSON object (no markdown) with this structure:
    {{
      "dosage": "Suggested dosage (e.g. 500mg)",
      "frequency": "Frequency (Must be one of: 'Once daily', 'Twice daily', 'Three times daily', 'As needed')",
      "explanation": "Brief 1-sentence medical explanation for this dosage based on the age/weight."
    }}

    If you are unsure or the medication is high-risk, suggest 'As prescribed' and advise consulting a doctor.
    """

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        model_name = 'models/gemini-2.5-flash'

        response = await asyncio.to_thread(
            client.models.generate_content,
            model=model_name,
            contents=prompt
        )
        text = response.text.strip()
        
        if "```json" in text:
            text = text.split("```json")[-1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        return json.loads(text)
    except Exception as e:
        print(f"AI Medication Recommendation Error: {e}")
        return None
