import sqlite3
import sys

def main():
    try:
        with open('C:\\xampp\\htdocs\\health\\backend\\mig_out.txt', 'w') as f:
            f.write("Starting migration...\n")
            db = sqlite3.connect('C:\\xampp\\htdocs\\health\\backend\\health.db', timeout=10)
            f.write("Connected...\n")
            db.execute('ALTER TABLE users ADD COLUMN profile_picture TEXT')
            db.commit()
            f.write("Migration successful.\n")
            db.close()
    except Exception as e:
        with open('C:\\xampp\\htdocs\\health\\backend\\mig_out.txt', 'a') as f:
            f.write(f"Error: {e}\n")

if __name__ == "__main__":
    main()
