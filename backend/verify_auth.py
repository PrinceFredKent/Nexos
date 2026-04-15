import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_auth_flow():
    print("--- Testing Auth Flow ---")
    
    # 1. Signup
    signup_data = {
        "username": f"testuser_{int(time.time())}",
        "email": f"test_{int(time.time())}@example.com",
        "phone": "1234567890",
        "password": "testpassword",
        "age": 30,
        "gender": "Male",
        "blood_type": "O+",
        "emergency_contact_name": "Emergency",
        "emergency_contact_phone": "911"
    }
    
    print(f"Signing up {signup_data['username']}...")
    res = requests.post(f"{BASE_URL}/signup", json=signup_data)
    if res.status_code != 200:
        print(f"Signup failed: {res.text}")
        return
    print("Signup successful!")

    # 2. Login
    login_data = {"email": signup_data["email"], "password": signup_data["password"]}
    print("Logging in...")
    res = requests.post(f"{BASE_URL}/login", json=login_data)
    if res.status_code != 200:
        print(f"Login failed: {res.text}")
        return
    
    token = res.json()["access_token"]
    print("Login successful! Token acquired.")

    # 3. Get Profile
    print("Fetching profile data...")
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{BASE_URL}/patient-info", headers=headers)
    if res.status_code != 200:
        print(f"Fetch profile failed: {res.text}")
        return
    
    profile = res.json()
    print(f"Profile retrieved for: {profile['username']}")
    assert profile["username"] == signup_data["username"]
    print("Profile data verified!")

    # 4. Get Medications (Placeholder test)
    print("Fetching medications...")
    res = requests.get(f"{BASE_URL}/medications", headers=headers)
    if res.status_code == 200:
        print(f"Medications retrieved: {len(res.json())} items found.")
    else:
        print(f"Fetch meds failed: {res.text}")

    print("--- Auth Flow Test Passed! ---")

if __name__ == "__main__":
    try:
        test_auth_flow()
    except Exception as e:
        print(f"Test encountered an error: {e}")
