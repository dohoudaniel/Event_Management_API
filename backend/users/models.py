from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.

# Create a list of choices for the user's role
USER_ROLE_CHOICES = (
    ('attendee', 'Attendee'),
    ('organizer', 'Organizer'),
)

class User(AbstractUser):
    # Overwrite the default email field to make it unique
    email = models.EmailField(unique=True)
    
    # Add a custom role field with choices
    role = models.CharField(
        max_length=10,
        choices=USER_ROLE_CHOICES,
        default='attendee'
    )

    # Using the email field as the primary login identifier
    USERNAME_FIELD = 'email'
    
    # Keep username as a required field for administrative purposes
    # as per Django's AbstractUser requirements.
    REQUIRED_FIELDS = ['username']

    def is_organizer(self):
        """
        A helper method to check if the user is an organizer.
        """
        return self.role == 'organizer'
