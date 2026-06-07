import os, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text
import psycopg2

DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

params = {
    'id': 14, 
    'username': 'Hayati', 
    'email': 'princefattahkent@gmail.com', 
    'hashed_password': '$2b$12$vu92//LQc3U7nt7eHdBMesfjZfesDxPHF321zzPGj0NZ5s1c3I/S', 
    'phone': '0756286161', 
    'birth_date': '2004-08-15', 
    'age': None, 
    'gender': 'Female', 
    'blood_type': 'AB+', 
    'weight': '65', 
    'height': '180', 
    'allergies': '', 
    'chronic_conditions': '', 
    'emergency_contact_name': 'Fred', 
    'emergency_contact_phone': '0756286160', 
    'profile_picture': None, 
    'synced_at': None, 
    'last_modified': '2026-06-07 21:25:24.810131', 
    'google_id': None, 
    'is_verified': 1, 
    'otp_code': None, 
    'otp_expiry': None, 
    'is_pregnant': False, 
    'pregnancy_due_date': None, 
    'pregnancy_conception_date': None
}

sql = """
INSERT INTO users (
    id, username, email, hashed_password, phone, birth_date, age, gender, 
    blood_type, weight, height, allergies, chronic_conditions, 
    emergency_contact_name, emergency_contact_phone, profile_picture, 
    synced_at, last_modified, google_id, is_verified, otp_code, otp_expiry, 
    is_pregnant, pregnancy_due_date, pregnancy_conception_date
) VALUES (
    :id, :username, :email, :hashed_password, :phone, :birth_date, :age, :gender, 
    :blood_type, :weight, :height, :allergies, :chronic_conditions, 
    :emergency_contact_name, :emergency_contact_phone, :profile_picture, 
    :synced_at, :last_modified, :google_id, :is_verified, :otp_code, :otp_expiry, 
    :is_pregnant, :pregnancy_due_date, :pregnancy_conception_date
)
ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username, 
    email = EXCLUDED.email, 
    hashed_password = EXCLUDED.hashed_password, 
    phone = EXCLUDED.phone, 
    birth_date = EXCLUDED.birth_date, 
    age = EXCLUDED.age, 
    gender = EXCLUDED.gender, 
    blood_type = EXCLUDED.blood_type, 
    weight = EXCLUDED.weight, 
    height = EXCLUDED.height, 
    allergies = EXCLUDED.allergies, 
    chronic_conditions = EXCLUDED.chronic_conditions, 
    emergency_contact_name = EXCLUDED.emergency_contact_name, 
    emergency_contact_phone = EXCLUDED.emergency_contact_phone, 
    profile_picture = EXCLUDED.profile_picture, 
    synced_at = EXCLUDED.synced_at, 
    last_modified = EXCLUDED.last_modified, 
    google_id = EXCLUDED.google_id, 
    is_verified = EXCLUDED.is_verified, 
    otp_code = EXCLUDED.otp_code, 
    otp_expiry = EXCLUDED.otp_expiry, 
    is_pregnant = EXCLUDED.is_pregnant, 
    pregnancy_due_date = EXCLUDED.pregnancy_due_date, 
    pregnancy_conception_date = EXCLUDED.pregnancy_conception_date
"""

try:
    with engine.connect() as conn:
        conn.execute(text(sql), params)
        print("Success! The query executed without issues.")
except Exception as e:
    print(f"Error occurred: {e}")
    if hasattr(e, 'orig'):
        print(f"Original error class: {e.orig.__class__}")
        print(f"Original error message: {e.orig}")
        if hasattr(e.orig, 'pgcode'):
            print(f"Postgres code: {e.orig.pgcode}")
        if hasattr(e.orig, 'diag'):
            print(f"Diagnostic message: {e.orig.diag.message_primary}")
            print(f"Constraint name: {e.orig.diag.constraint_name}")
            print(f"Detail: {e.orig.diag.message_detail}")
