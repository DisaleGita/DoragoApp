from email.message import EmailMessage

import aiosmtplib

from app.core.config import Settings
from app.core.errors import ApiError


class OtpEmailSender:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def send(self, email: str, code: str) -> None:
        if self.settings.enable_dev_otp_bypass:
            return
        if not self.settings.smtp_host or not self.settings.smtp_from_email:
            raise ApiError(
                503, "email_unavailable", "Verification email is temporarily unavailable."
            )

        message = EmailMessage()
        message["From"] = self.settings.smtp_from_email
        message["To"] = email
        message["Subject"] = "Your Dorago verification code"
        message.set_content(
            f"Your Dorago verification code is {code}. It expires in "
            f"{self.settings.otp_ttl_minutes} minutes."
        )
        await aiosmtplib.send(
            message,
            hostname=self.settings.smtp_host,
            port=self.settings.smtp_port,
            username=self.settings.smtp_username,
            password=(
                self.settings.smtp_password.get_secret_value()
                if self.settings.smtp_password
                else None
            ),
            start_tls=True,
        )
