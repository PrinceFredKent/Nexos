import sqlite3

def fix_email():
    conn = sqlite3.connect('C:\\xampp\\htdocs\\health\\backend\\health.db')
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET email = 'jeffmc@gmail.com' WHERE email = 'jeffmc@gmailcom'")
    conn.commit()
    conn.close()
    print("Email fixed locally.")

if __name__ == "__main__":
    fix_email()
