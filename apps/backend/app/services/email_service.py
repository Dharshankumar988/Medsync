import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger("medsync.email")

class EmailService:
    @staticmethod
    def send_patient_password_reset_email(
        to_email: str,
        patient_name: str,
        reset_link: str
    ) -> Dict[str, Any]:
        """
        Sends a password reset email to a Patient using Python's standard smtplib.
        The link has a strict 5-minute timeout.
        """
        subject = "Reset Your MedSync Password (Valid for 5 Minutes)"
        
        # Plain text fallback
        text_content = (
            f"Hello {patient_name},\n\n"
            f"We received a request to reset the password for your MedSync Patient account ({to_email}).\n\n"
            f"Click the link below to set a new password:\n"
            f"{reset_link}\n\n"
            f"SECURITY NOTICE: This reset link expires in strictly 5 MINUTES. "
            f"If you did not request a password reset, you can safely ignore this email.\n\n"
            f"— MedSync Healthcare System"
        )
        
        # HTML Email Body
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your MedSync Password</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }}
    .container {{ max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
    .header {{ background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); padding: 32px 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }}
    .header p {{ margin: 6px 0 0; font-size: 13px; opacity: 0.9; }}
    .body {{ padding: 32px 28px; line-height: 1.6; }}
    .body h2 {{ font-size: 18px; color: #0f172a; margin-top: 0; }}
    .btn-container {{ text-align: center; margin: 28px 0; }}
    .btn {{ display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 600; text-decoration: none; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }}
    .countdown-alert {{ background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px; font-size: 13px; color: #991b1b; margin-top: 24px; }}
    .url-fallback {{ word-break: break-all; font-family: monospace; font-size: 12px; color: #2563eb; background: #eff6ff; padding: 10px; border-radius: 8px; margin-top: 8px; }}
    .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; background-color: #fafafa; border-top: 1px solid #f1f5f9; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MedSync</h1>
      <p>Secure Patient Healthcare Portal</p>
    </div>
    <div class="body">
      <h2>Hello {patient_name},</h2>
      <p>We received a password reset request for your MedSync Patient account associated with <strong>{to_email}</strong>.</p>
      <p>Click the button below to set your new password:</p>
      
      <div class="btn-container">
        <a href="{reset_link}" class="btn" target="_blank" rel="noopener noreferrer">Reset Patient Password</a>
      </div>

      <div class="countdown-alert">
        <strong>⚠️ Strict 5-Minute Expiration:</strong>
        <p style="margin: 4px 0 0;">This password reset link is short-lived and will expire in exactly <strong>5 minutes</strong>. After 5 minutes, accessing this link will result in a 404 timeout error.</p>
      </div>

      <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
        If the button above does not work, copy and paste this URL into your browser:
        <div class="url-fallback">{reset_link}</div>
      </p>
    </div>
    <div class="footer">
      &copy; {datetime.utcnow().year} MedSync Healthcare Ecosystem. All rights reserved.<br>
      This is an automated system email authorized via Python SMTP.
    </div>
  </div>
</body>
</html>"""

        # Prepare MIME Message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = settings.SMTP_FROM
        message["To"] = to_email
        
        part1 = MIMEText(text_content, "plain")
        part2 = MIMEText(html_content, "html")
        message.attach(part1)
        message.attach(part2)

        # Attempt sending via SMTP if configured
        smtp_user = settings.SMTP_USER
        smtp_password = settings.SMTP_PASSWORD
        smtp_host = settings.SMTP_HOST
        smtp_port = settings.SMTP_PORT
        
        if smtp_host and smtp_user and smtp_password:
            try:
                logger.info(f"Connecting to SMTP server {smtp_host}:{smtp_port} for {to_email}...")
                if settings.SMTP_SSL:
                    server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
                else:
                    server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
                    if settings.SMTP_TLS:
                        server.starttls()
                        
                server.login(smtp_user, smtp_password)
                server.sendmail(settings.SMTP_FROM, [to_email], message.as_string())
                server.quit()
                logger.info(f"Password reset email sent via SMTP to {to_email}")
                return {
                    "success": True,
                    "method": "smtp",
                    "recipient": to_email,
                    "preview_link": reset_link
                }
            except Exception as e:
                logger.warning(f"SMTP delivery failed: {e}. Falling back to developer preview mode.")
        
        # Dev / fallback mode (when local environment doesn't have live SMTP credentials)
        print("=" * 60)
        print(f"[MedSync Python SMTP Service] Password Reset Link for Patient: {to_email}")
        print(f"Target URL (Expires in 5 minutes): {reset_link}")
        print("=" * 60)
        
        return {
            "success": True,
            "method": "preview_mode",
            "recipient": to_email,
            "preview_link": reset_link
        }

email_service = EmailService()
