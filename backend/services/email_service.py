import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr

log = logging.getLogger("nexos")

def get_otp_email_template(otp_code: str, username: str):
    """Returns a premium, polished HTML template for OTP verification."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: 'Outfit', 'Inter', sans-serif; background-color: #050c1a; margin: 0; padding: 0; color: #ffffff; }}
            .container {{ max-width: 600px; margin: 40px auto; background: #0a1931; border-radius: 32px; overflow: hidden; border: 1px solid rgba(67, 97, 238, 0.2); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }}
            .header {{ background: linear-gradient(135deg, #4361ee, #4ea8de); padding: 40px 20px; text-align: center; }}
            .logo {{ width: 60px; height: 60px; background: rgba(255, 255, 255, 0.1); border-radius: 50%; padding: 10px; border: 2px solid #ffffff; margin-bottom: 20px; }}
            .content {{ padding: 40px; text-align: center; }}
            h1 {{ font-size: 28px; font-weight: 800; margin-bottom: 16px; letter-spacing: -1px; }}
            p {{ font-size: 16px; line-height: 1.6; color: #94a3b8; margin-bottom: 32px; }}
            .otp-container {{ background: rgba(67, 97, 238, 0.1); border: 2px dashed #4361ee; border-radius: 16px; padding: 24px; display: inline-block; margin-bottom: 32px; }}
            .otp-code {{ font-size: 42px; font-weight: 900; letter-spacing: 8px; color: #4361ee; margin: 0; }}
            .footer {{ padding: 32px; text-align: center; font-size: 12px; color: #4b5563; border-top: 1px solid rgba(255, 255, 255, 0.05); }}
            .btn {{ display: inline-block; padding: 16px 32px; background: #4361ee; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div style="font-size: 32px; font-weight: 900; letter-spacing: 5px; color: white;">NEXOS</div>
            </div>
            <div class="content">
                <h1>Verify Your Identity</h1>
                <p>Hello <strong>{username}</strong>,<br>Use the code below to securely verify your account and unlock your elite health intelligence dashboard.</p>
                
                <div class="otp-container">
                    <div class="otp-code">{otp_code}</div>
                </div>
                
                <p>This code will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
            </div>
            <div class="footer">
                &copy; 2026 NEXOS Health Intelligence. All rights reserved.<br>
                This is an automated security message.
            </div>
        </div>
    </body>
    </html>
    """

async def _send_real_email(to_email: str, subject: str, html_content: str):
    """Internal helper to send an actual email via SMTP, falling back to logging if unconfigured."""
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASSWORD")
    smtp_from = os.environ.get("SMTP_FROM", smtp_user)
    
    if not smtp_host or not smtp_user or not smtp_pass:
        log.warning("SMTP not fully configured in .env. Falling back to console logging.")
        log.info(f"--- EMAIL TO {to_email} ---")
        log.info(f"Subject: {subject}")
        return False
        
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr(("NEXOS Health", smtp_from))
        msg["To"] = to_email
        
        part = MIMEText(html_content, "html")
        msg.attach(part)
        
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_from, to_email, msg.as_string())
        server.quit()
        
        log.info(f"Successfully sent email to {to_email}")
        return True
    except Exception as e:
        log.error(f"Failed to send email to {to_email}: {str(e)}")
        # Fallback to logging so user isn't stuck during dev
        log.info(f"--- FALLBACK EMAIL TO {to_email} ---")
        log.info(f"Subject: {subject}")
        return False

async def send_otp_email(email: str, username: str, otp_code: str):
    """Sends the OTP email."""
    html_content = get_otp_email_template(otp_code, username)
    subject = f"NEXOS - Account Verification Code: {otp_code}"
    log.info(f"OTP Code for {email}: {otp_code}")
    await _send_real_email(email, subject, html_content)
    return True

def get_welcome_email_template(username: str):
    """Returns a premium, polished HTML template for the welcome message."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: 'Outfit', 'Inter', sans-serif; background-color: #050c1a; margin: 0; padding: 0; color: #ffffff; }}
            .container {{ max-width: 600px; margin: 40px auto; background: #0a1931; border-radius: 32px; overflow: hidden; border: 1px solid rgba(67, 97, 238, 0.2); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }}
            .header {{ background: linear-gradient(135deg, #4361ee, #4ea8de); padding: 40px 20px; text-align: center; }}
            .content {{ padding: 40px; text-align: center; }}
            h1 {{ font-size: 28px; font-weight: 800; margin-bottom: 16px; letter-spacing: -1px; }}
            p {{ font-size: 16px; line-height: 1.6; color: #94a3b8; margin-bottom: 32px; }}
            .footer {{ padding: 32px; text-align: center; font-size: 12px; color: #4b5563; border-top: 1px solid rgba(255, 255, 255, 0.05); }}
            .btn {{ display: inline-block; padding: 16px 32px; background: #4361ee; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div style="font-size: 32px; font-weight: 900; letter-spacing: 5px; color: white;">NEXOS</div>
            </div>
            <div class="content">
                <h1>Welcome to Nexos, {username}!</h1>
                <p>We're thrilled to have you join our elite health intelligence community. Your journey to advanced, AI-driven wellness starts now.</p>
                
                <p>Our systems are currently preparing your personalized dashboard and syncing your medical records to ensure a seamless experience.</p>
                
                <a href="#" class="btn">Explore Your Dashboard</a>
                
                <p style="margin-top: 32px;">If you have any questions, our support team is always here to assist you.</p>
            </div>
            <div class="footer">
                &copy; 2026 NEXOS Health Intelligence. All rights reserved.<br>
                Empowering your health through clinical-grade AI.
            </div>
        </div>
    </body>
    </html>
    """

async def send_welcome_email(email: str, username: str):
    """Sends the welcome email to new users."""
    html_content = get_welcome_email_template(username)
    subject = f"Welcome to NEXOS Health Intelligence, {username}!"
    await _send_real_email(email, subject, html_content)
    return True

def get_password_reset_email_template(otp_code: str, username: str):
    """Returns a premium, polished HTML template for password reset."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: 'Outfit', 'Inter', sans-serif; background-color: #050c1a; margin: 0; padding: 0; color: #ffffff; }}
            .container {{ max-width: 600px; margin: 40px auto; background: #0a1931; border-radius: 32px; overflow: hidden; border: 1px solid rgba(67, 97, 238, 0.2); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }}
            .header {{ background: linear-gradient(135deg, #4361ee, #4ea8de); padding: 40px 20px; text-align: center; }}
            .content {{ padding: 40px; text-align: center; }}
            h1 {{ font-size: 28px; font-weight: 800; margin-bottom: 16px; letter-spacing: -1px; }}
            p {{ font-size: 16px; line-height: 1.6; color: #94a3b8; margin-bottom: 32px; }}
            .otp-container {{ background: rgba(67, 97, 238, 0.1); border: 2px dashed #4361ee; border-radius: 16px; padding: 24px; display: inline-block; margin-bottom: 32px; }}
            .otp-code {{ font-size: 42px; font-weight: 900; letter-spacing: 8px; color: #4361ee; margin: 0; }}
            .footer {{ padding: 32px; text-align: center; font-size: 12px; color: #4b5563; border-top: 1px solid rgba(255, 255, 255, 0.05); }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div style="font-size: 32px; font-weight: 900; letter-spacing: 5px; color: white;">NEXOS</div>
            </div>
            <div class="content">
                <h1>Reset Your Password</h1>
                <p>Hello <strong>{username}</strong>,<br>We received a request to reset the password for your NEXOS account. Use the code below to securely reset your password.</p>
                
                <div class="otp-container">
                    <div class="otp-code">{otp_code}</div>
                </div>
                
                <p>This code will expire in 10 minutes. If you didn't request a password reset, you can safely ignore this email; your account remains secure.</p>
            </div>
            <div class="footer">
                &copy; 2026 NEXOS Health Intelligence. All rights reserved.<br>
                This is an automated security message.
            </div>
        </div>
    </body>
    </html>
    """

async def send_password_reset_email(email: str, username: str, otp_code: str):
    """Sends the password reset email."""
    html_content = get_password_reset_email_template(otp_code, username)
    subject = f"NEXOS - Password Reset Code: {otp_code}"
    log.info(f"Password Reset Code for {email}: {otp_code}")
    await _send_real_email(email, subject, html_content)
    return True
