import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils.text import slugify
from django.urls import reverse # For generating invitation links
from django.core.exceptions import ValidationError
from django.conf import settings # To access BASE_URL for invitation links

User = get_user_model()

EVENT_STATUS_CHOICES = (
    ('upcoming', 'Upcoming'),
    ('active', 'Active'),
    ('cancelled', 'Cancelled'),
    ('completed', 'Completed'),
)

SPONSORSHIP_LEVELS = (
    ('gold', 'Gold'),
    ('silver', 'Silver'),
    ('bronze', 'Bronze'),
)

RSVP_STATUS_CHOICES = (
    ('going', 'Going'),
    ('not_going', 'Not Going'),
    ('maybe', 'Maybe'),
)

class SlugMixin(models.Model):
    """
    A mixin to automatically generate a unique slug for a model instance.
    Assumes the model has a 'name' field and a 'slug' field.
    """
    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            # Ensure the slug is unique by appending a number if it exists
            while self.__class__.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    class Meta:
        abstract = True

class Venue(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=20)
    capacity = models.IntegerField()
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Speaker(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    bio = models.TextField(blank=True, null=True)
    organization = models.CharField(max_length=255, blank=True, null=True)
    title = models.CharField(max_length=255, blank=True, null=True)
    photo_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

class Sponsor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    logo_url = models.URLField(blank=True, null=True)
    website_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name

class Category(SlugMixin, models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)

    def __str__(self):
        return self.name

class Tag(SlugMixin, models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True, blank=True)

    def __str__(self):
        return self.name

class Event(SlugMixin, models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organized_events')
    venue = models.ForeignKey(Venue, on_delete=models.SET_NULL, related_name='events', blank=True, null=True)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    description = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    location_details = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=10, choices=EVENT_STATUS_CHOICES, default='upcoming')
    max_attendees = models.IntegerField(blank=True, null=True)
    ticket_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    is_private = models.BooleanField(default=False) # New field for private events
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    speakers = models.ManyToManyField(Speaker, related_name='speaking_at', through='Event_Speaker')
    sponsors = models.ManyToManyField(Sponsor, related_name='sponsoring', through='Event_Sponsor')
    categories = models.ManyToManyField(Category, related_name='events')
    tags = models.ManyToManyField(Tag, related_name='events')
    
    def clean(self):
        """
        Adds validation to ensure end date/time is after start date/time.
        """
        super().clean()
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValidationError({'end_date': 'End date cannot be before the start date.'})
        
        if self.start_date == self.end_date and self.end_time and self.start_time and self.end_time < self.start_time:
            raise ValidationError({'end_time': 'End time cannot be before the start time on the same day.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Event_Speaker(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='event_speakers')
    speaker = models.ForeignKey(Speaker, on_delete=models.CASCADE)
    presentation_topic = models.CharField(max_length=255, blank=True, null=True)
    presentation_start_time = models.DateTimeField(blank=True, null=True)
    presentation_end_time = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = "Event Speaker"
        verbose_name_plural = "Event Speakers"
        unique_together = ('event', 'speaker')

    def __str__(self):
        return f"{self.event.name} - {self.speaker.first_name}"

class Event_Sponsor(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='event_sponsors')
    sponsor = models.ForeignKey(Sponsor, on_delete=models.CASCADE)
    sponsorship_level = models.CharField(max_length=10, choices=SPONSORSHIP_LEVELS)
    sponsorship_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    start_date = models.DateField()
    end_date = models.DateField()
    
    class Meta:
        verbose_name = "Event Sponsor"
        verbose_name_plural = "Event Sponsors"
        unique_together = ('event', 'sponsor')
    
    def __str__(self):
        return f"{self.event.name} - {self.sponsor.name}"

class Registration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='registrations')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='registrations')
    status = models.CharField(max_length=10, choices=RSVP_STATUS_CHOICES, default='going')
    registration_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('event', 'user')

    def __str__(self):
        return f"{self.user.username} for {self.event.name}"

class Invitation(models.Model):
    """
    Model for private event invitations.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField()
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    accepted = models.BooleanField(default=False)
    invited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_invitations')
    created_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('event', 'email') # A specific email can only be invited once per event

    def get_absolute_url(self):
        """Generates the path for accepting the invitation. The full URL is constructed in the task."""
        # The URL name is 'invitation-accept' and it's in the 'events' namespace.
        return reverse('events:invitation-accept', kwargs={'token': self.token})

    def __str__(self):
        return f"Invitation for {self.email} to {self.event.name}"

class Notification(models.Model):
    """
    Model for user notifications (e.g., event reminders, invitation accepted).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    event = models.ForeignKey(Event, on_delete=models.CASCADE, null=True, blank=True, related_name='event_notifications')
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.user.username}: {self.message[:50]}..."