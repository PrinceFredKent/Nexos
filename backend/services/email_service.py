import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr

log = logging.getLogger("nexos")

def get_logo_url() -> str:
    """Returns the correct public URL for the Nexos app-icon logo."""
    frontend_url = os.environ.get("FRONTEND_URL", "https://nexos-health.pages.dev").rstrip('/')
    if "localhost" in frontend_url or "127.0.0.1" in frontend_url:
        return "https://nexos-health.pages.dev/app-icon.jpg"
    return f"{frontend_url}/app-icon.jpg"

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
            .logo {{ width: 80px; height: 80px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.8); object-fit: cover; display: block; margin: 0 auto 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }}
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
                <img src="{get_logo_url()}" alt="Nexos" class="logo" />
                <div style="font-size: 18px; font-weight: 800; letter-spacing: 4px; color: white; opacity: 0.9;">NEXOS</div>
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

def _send_via_resend(to_email: str, subject: str, html_content: str) -> bool:
    """
    Send email via Resend HTTP API (https://resend.com).
    NOTE: RESEND_FROM must be a verified domain address (not Gmail).
    Uses port 443 (HTTPS) — works on Railway/Render where SMTP may be blocked.
    """
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        log.info("Resend: RESEND_API_KEY not set — skipping")
        return False

    try:
        import urllib.request
        import urllib.error
        import json as _json

        from_name = "NEXOS Health"
        from_addr = os.environ.get("RESEND_FROM", "onboarding@resend.dev")
        from_header = f"{from_name} <{from_addr}>"

        log.info(f"Resend: attempting to send to {to_email} from {from_addr}")

        payload = _json.dumps({
            "from": from_header,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            result = _json.loads(resp.read().decode())
            log.info(f"Resend: delivered to {to_email} — id: {result.get('id')}")
            return True

    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        log.error(f"Resend: HTTP {e.code} for {to_email} | from={from_addr} | body={body}")
        print(f"DEBUG Resend HTTP {e.code}: {body}")
        return False
    except Exception as e:
        log.error(f"Resend: unexpected error for {to_email}: {e}")
        return False


def _send_via_brevo(to_email: str, subject: str, html_content: str) -> bool:
    """
    Send email via Brevo HTTP API (https://brevo.com).
    Allows sending to ANY email address without domain verification.
    Uses port 443 (HTTPS) — works on Render free tier.
    """
    api_key = os.environ.get("BREVO_API_KEY")
    if not api_key:
        return False

    try:
        import urllib.request
        import json as _json

        # Brevo allows sending from the email you registered with.
        # Fallback to nexoshealthai@gmail.com if not set
        sender_email = os.environ.get("SMTP_FROM") or os.environ.get("SMTP_USER") or "nexoshealthai@gmail.com"
        
        payload = _json.dumps({
            "sender": {"name": "NEXOS Health", "email": sender_email},
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": html_content
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://api.brevo.com/v3/smtp/email",
            data=payload,
            headers={
                "api-key": api_key,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            log.info(f"Brevo delivered email to {to_email}")
            print(f"DEBUG: Brevo OK to {to_email}")
            return True

    except Exception as e:
        log.error(f"Brevo failed for {to_email}: {e}")
        print(f"DEBUG: Brevo error: {e}")
        return False

def _send_real_email(to_email: str, subject: str, html_content: str):
    """
    Send email — tries providers in priority order:
      1. Brevo HTTP API  (free, no domain verification, 300/day)
      2. Resend HTTP API (requires verified sender domain)
      3. SMTP            (local dev only — blocked on Railway/Render)
    """
    attempted = []

    # ── Priority 1: Brevo HTTP API (no domain verification needed) ──
    attempted.append("Brevo")
    if _send_via_brevo(to_email, subject, html_content):
        return True

    # ── Priority 2: Resend HTTP API (verified domain required) ──
    attempted.append("Resend")
    if _send_via_resend(to_email, subject, html_content):
        return True

    # ── Priority 3: Direct SMTP (local dev only) ──
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASSWORD")
    smtp_from = os.environ.get("SMTP_FROM", smtp_user)

    if smtp_host and smtp_user and smtp_pass:
        attempted.append("SMTP")
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = formataddr(("NEXOS Health", smtp_from))
            msg["To"] = to_email
            msg.attach(MIMEText(html_content, "html"))

            log.info(f"SMTP: connecting to {smtp_host}:{smtp_port}")
            if smtp_port == 465:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15)
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)
                server.starttls()

            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, to_email, msg.as_string())
            server.quit()
            log.info(f"SMTP: sent to {to_email}")
            return True
        except Exception as e:
            log.error(f"SMTP: failed for {to_email}: {e}")

    log.error(f"EMAIL DELIVERY FAILED for {to_email} — tried: {', '.join(attempted)}. "
              f"Configure BREVO_API_KEY in Railway env vars.")
    return False

def send_otp_email(email: str, username: str, otp_code: str) -> bool:
    """Sends the OTP email."""
    print(f"DEBUG: Preparing to send OTP to {email}")
    html_content = get_otp_email_template(otp_code, username)
    subject = f"NEXOS - Account Verification Code: {otp_code}"
    log.info(f"OTP Code for {email}: {otp_code}")
    return _send_real_email(email, subject, html_content)

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
            .logo {{ width: 80px; height: 80px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.8); object-fit: cover; display: block; margin: 0 auto 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }}
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
                <img src="{get_logo_url()}" alt="Nexos" class="logo" />
                <div style="font-size: 18px; font-weight: 800; letter-spacing: 4px; color: white; opacity: 0.9;">NEXOS</div>
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

def send_welcome_email(email: str, username: str) -> bool:
    """Sends the welcome email to new users."""
    html_content = get_welcome_email_template(username)
    subject = f"Welcome to NEXOS Health Intelligence, {username}!"
    return _send_real_email(email, subject, html_content)

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
            .logo {{ width: 80px; height: 80px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.8); object-fit: cover; display: block; margin: 0 auto 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }}
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
                <img src="{get_logo_url()}" alt="Nexos" class="logo" />
                <div style="font-size: 18px; font-weight: 800; letter-spacing: 4px; color: white; opacity: 0.9;">NEXOS</div>
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

def send_password_reset_email(email: str, username: str, otp_code: str) -> bool:
    """Sends the password reset email."""
    html_content = get_password_reset_email_template(otp_code, username)
    subject = f"NEXOS - Password Reset Code: {otp_code}"
    log.info(f"Password Reset Code for {email}: {otp_code}")
    return _send_real_email(email, subject, html_content)

def get_security_verification_email_template(otp_code: str, username: str):
    """Returns a premium, polished HTML template for security verification (password change)."""
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
            .logo {{ width: 80px; height: 80px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.8); object-fit: cover; display: block; margin: 0 auto 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }}
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
                <img src="https://nexos.pages.dev/app-icon.jpg" alt="Nexos" class="logo" />
                <div style="font-size: 18px; font-weight: 800; letter-spacing: 4px; color: white; opacity: 0.9;">NEXOS</div>
            </div>
            <div class="content">
                <h1>Security Verification</h1>
                <p>Hello <strong>{username}</strong>,<br>A request was made to change your NEXOS account password. Use the verification code below to authorize this change.</p>
                
                <div class="otp-container">
                    <div class="otp-code">{otp_code}</div>
                </div>
                
                <p>This code will expire in 10 minutes. If you did not request this change, please update your security settings immediately.</p>
            </div>
            <div class="footer">
                &copy; 2026 NEXOS Health Intelligence. All rights reserved.<br>
                Protected by Nexos Elite Security Protocol.
            </div>
        </div>
    </body>
    </html>
    """

def send_security_otp_email(email: str, username: str, otp_code: str) -> bool:
    """Sends the security verification OTP email."""
    html_content = get_security_verification_email_template(otp_code, username)
    subject = f"NEXOS - Security Verification Code: {otp_code}"
    log.info(f"Security OTP Code for {email}: {otp_code}")
    return _send_real_email(email, subject, html_content)
