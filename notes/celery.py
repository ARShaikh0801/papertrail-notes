import os
from celery import Celery

# Set default Django settings module for 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'notes.settings')

app = Celery('notes')

# Load configuration from Django settings using CELERY_ prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps (looks for tasks.py files).
app.autodiscover_tasks()
