import os
import json
import logging
import urllib.request
import urllib.error

log = logging.getLogger("nexos")

TERMII_API_URL = "https://api.ng.termii.com/api/sms/send"


def _normalize_phone(phone: str) -> str:
    """
    Normalise phone number to E.164 digits only (no leading +).
    e.g.  +254712345678  ->  254712345678
          0712345678     ->  0712345678   (left as-is if no country prefix)
    Termii expects digits only, no '+' or spaces.
    """
    return phone.strip().lstrip("+").replace(" ", "").replace("-", "")


def send_otp_sms(phone: str, otp_code: str, username: str = "") -> bool:
    """
    Send an OTP verification code via Termii SMS.

    Required env vars:
        TERMII_API_KEY   — from https://accounts.termii.com/#/
        TERMII_SENDER_ID — optional branded sender name (max 11 chars, e.g. 'NEXOS')
                           Defaults to 'N-Alert' if not set.
    Returns True on success, False on failure.
    """
    api_key = os.environ.get("TERMII_API_KEY")
    if not api_key:
        log.info("Termii: TERMII_API_KEY not set — skipping SMS")
        return False

    sender_id = os.environ.get("TERMII_SENDER_ID", "N-Alert")
    to = _normalize_phone(phone)

    greeting = f"Hi {username}, " if username else ""
    message = (
        f"{greeting}Your NEXOS verification code is: {otp_code}. "
        f"It expires in 10 minutes. Do not share this code."
    )

    payload = json.dumps({
        "to": to,
        "from": sender_id,
        "sms": message,
        "type": "plain",
        "channel": "generic",   # 'generic' tries all routes incl. DND
        "api_key": api_key,
    }).encode("utf-8")

    req = urllib.request.Request(
        TERMII_API_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode())
            msg_id = result.get("message_id") or result.get("messageId") or "n/a"
            log.info(f"Termii: SMS sent to {to} — message_id: {msg_id}")
            return True

    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        log.error(f"Termii: HTTP {e.code} for {to} | body: {body}")
        return False

    except Exception as e:
        log.error(f"Termii: unexpected error sending SMS to {to}: {e}")
        return False


def send_password_reset_sms(phone: str, otp_code: str, username: str = "") -> bool:
    """Send a password reset OTP via Termii SMS."""
    api_key = os.environ.get("TERMII_API_KEY")
    if not api_key:
        log.info("Termii: TERMII_API_KEY not set — skipping password reset SMS")
        return False

    sender_id = os.environ.get("TERMII_SENDER_ID", "N-Alert")
    to = _normalize_phone(phone)

    greeting = f"Hi {username}, " if username else ""
    message = (
        f"{greeting}Your NEXOS password reset code is: {otp_code}. "
        f"It expires in 10 minutes. If you did not request this, ignore this message."
    )

    payload = json.dumps({
        "to": to,
        "from": sender_id,
        "sms": message,
        "type": "plain",
        "channel": "generic",
        "api_key": api_key,
    }).encode("utf-8")

    req = urllib.request.Request(
        TERMII_API_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode())
            msg_id = result.get("message_id") or result.get("messageId") or "n/a"
            log.info(f"Termii: password reset SMS sent to {to} — message_id: {msg_id}")
            return True

    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        log.error(f"Termii: HTTP {e.code} for {to} | body: {body}")
        return False

    except Exception as e:
        log.error(f"Termii: unexpected error sending password reset SMS to {to}: {e}")
        return False
