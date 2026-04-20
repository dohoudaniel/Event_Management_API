import datetime
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from celery import shared_task

from .models import Event, Invitation, Notification, Registration
from users.models import User # Assuming User model is in users app

@shared_task
def send_invitation_email_task(invitation_id):
    """
    Sends an invitation email for a private event in the background.
    """
    try:
        invitation = Invitation.objects.get(id=invitation_id)
        event = invitation.event

        # Construct the full URL here, which is better practice
        base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
        invitation_link = f"{base_url}{invitation.get_absolute_url()}"

        subject = f"You're invited to {event.name}!"
        html_message = render_to_string('events/invitation_email.html', {
            'event': event,
            'invitation_link': invitation_link,
            'invited_by': invitation.invited_by.username if invitation.invited_by else 'An organizer'
        })
        plain_message = strip_tags(html_message)
        from_email = settings.DEFAULT_FROM_EMAIL
        to_email = [invitation.email]
        
        send_mail(subject, plain_message, from_email, to_email, html_message=html_message)
        print(f"Invitation email sent to {invitation.email} for event {event.name}")
        
    except Invitation.DoesNotExist:
        print(f"Invitation with ID {invitation_id} not found.")
    except Exception as e:
        print(f"Error sending invitation email for ID {invitation_id}: {e}")

@shared_task
def send_event_reminder_task(event_id, user_id, message):
    """
    Sends an event reminder notification to a specific user.
    Can be an email or an in-app notification.
    """
    try:
        event = Event.objects.get(id=event_id)
        user = User.objects.get(id=user_id)
        
        # Create an in-app notification
        Notification.objects.create(user=user, event=event, message=message)
        
        # Optionally, send an email reminder too
        subject = f"Reminder: {event.name} is coming up!"
        html_message = render_to_string('events/reminder_email.html', {
            'event': event,
            'user': user,
            'message': message,
        })
        plain_message = strip_tags(html_message)
        from_email = settings.DEFAULT_FROM_EMAIL
        to_email = [user.email]
        
        send_mail(subject, plain_message, from_email, to_email, html_message=html_message)
        print(f"Reminder sent to {user.username} for event {event.name}.")

    except (Event.DoesNotExist, User.DoesNotExist) as e:
        print(f"Error sending reminder: {e}")
    except Exception as e:
        print(f"Error in send_event_reminder_task: {e}")

@shared_task
def schedule_event_reminders_task():
    """
    Celery Beat task to schedule reminders for upcoming events.
    Runs periodically (e.g., every hour, as configured in settings).
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    
    # Events starting in the next 24 hours (or whatever interval you prefer)
    # and that haven't been completed or cancelled
    upcoming_events = Event.objects.filter(
        start_date__gte=now.date(),
        start_time__gte=now.time(), # This part needs careful handling if start_date is now.date()
        status='upcoming'
    ).exclude(status__in=['completed', 'cancelled']) # Exclude finished/cancelled events

    for event in upcoming_events:
        # Calculate reminder time (e.g., 24 hours before start)
        # This is a simplified check. For precise scheduling, you might use datetime arithmetic
        event_start_datetime = datetime.datetime.combine(event.start_date, event.start_time, tzinfo=datetime.timezone.utc)
        reminder_time = event_start_datetime - datetime.timedelta(days=1) # 24 hours before

        if now < reminder_time < now + datetime.timedelta(hours=1): # If reminder time is in the next hour
            registrations = Registration.objects.filter(event=event, status='going')
            for registration in registrations:
                message = f"Just a friendly reminder: '{event.name}' is starting on {event.start_date} at {event.start_time}!"
                # Schedule the specific reminder task
                send_event_reminder_task.apply_async(
                    (str(event.id), str(registration.user.id), message),
                    eta=reminder_time # Schedule to run exactly at reminder_time
                )
                print(f"Scheduled reminder for {registration.user.username} for event {event.name} at {reminder_time}")