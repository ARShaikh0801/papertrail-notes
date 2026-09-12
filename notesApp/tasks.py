from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def send_email_async(self, subject, text_content, html_content, recipient_email):
    """
    Celery task to send emails asynchronously in the background.
    
    Parameters:
        subject (str): Email subject line
        text_content (str): Plain text version of email
        html_content (str): Rich HTML version of email
        recipient_email (str): Target email address
    """
    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email]
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        logger.info(f"Successfully sent async email to {recipient_email}")
        return True
    except Exception as exc:
        logger.error(f"Failed to send email to {recipient_email}: {exc}")
        # Automatically retry up to 3 times with 5s delay
        raise self.retry(exc=exc)


@shared_task
def purge_expired_trash_task():
    """
    Celery scheduled periodic task to purge trashed notes deleted more than 30 days ago.
    """
    try:
        from .views import purge_expired_trash
        purge_expired_trash()
        logger.info("Successfully executed scheduled purge_expired_trash_task.")
        return True
    except Exception as exc:
        logger.error(f"Failed to execute purge_expired_trash_task: {exc}")
        raise
