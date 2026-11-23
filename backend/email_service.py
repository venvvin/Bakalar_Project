
import os
import smtplib

from email.message import EmailMessage
from urllib.parse import urlencode


SMTP_HOST = os.getenv("SMTP_HOST", "127.0.0.1")
SMTP_PORT = int(os.getenv("SMTP_PORT", "1025"))

FROM_EMAIL = "noreply@codeassess.local"

BACKEND_URL = "http://127.0.0.1:8001"


def send_verification_email(
    recipient_email: str,
    token: str
) -> None:
    verification_url = (
        f"{BACKEND_URL}/api/auth/verify-email?"
        + urlencode({"token": token})
    )

    message = EmailMessage()

    message["Subject"] = "CodeAssess - Potvrdenie e-mailu"
    message["From"] = FROM_EMAIL
    message["To"] = recipient_email

    message.set_content(
        f"""Vitajte v CodeAssess!

Dakujeme za registraciu.

Pre potvrdenie e-mailovej adresy otvorte tento odkaz:

{verification_url}

Odkaz je platny 15 minut.

Ak ste si ucet nevytvorili, tento e-mail ignorujte.

CodeAssess
"""
    )

    with smtplib.SMTP(
        SMTP_HOST,
        SMTP_PORT,
        timeout=10
    ) as smtp:
        smtp.send_message(message)
