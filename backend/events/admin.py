# This file configures the Django Admin interface for the event
# management models. The goal is to provide a clean and intuitive
# way for administrators to manage events, registrations, speakers,
# and sponsors.
#
from django.contrib import admin
from .models import Event, Venue, Speaker, Sponsor, Event_Speaker, Event_Sponsor, Registration

# --- Inline Admin Classes ---
# These are used to display related objects directly on the Event admin page.
# This makes it much easier to manage speakers and sponsors for a given event.

class EventSpeakerInline(admin.TabularInline):
    # This inline allows you to add or edit speakers directly from the Event page.
    model = Event_Speaker
    extra = 1  # Provides one extra blank form for adding a new speaker

class EventSponsorInline(admin.TabularInline):
    # This inline allows you to add or edit sponsors directly from the Event page.
    model = Event_Sponsor
    extra = 1

class RegistrationInline(admin.TabularInline):
    # This inline allows you to see all registrations for a given event.
    model = Registration
    extra = 0 # No extra blank forms for registrations, as they are created by users
    # FIX: Changed 'created_at' to 'registration_date' to match the model
    readonly_fields = ('user', 'status', 'registration_date')


# --- Model Admin Classes ---

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = (
        "name", 
        "organizer", 
        "start_date", 
        "status", 
        "venue", 
        "has_sponsors", 
        "has_speakers",
    )
    list_filter = ("status", "start_date", "venue")
    search_fields = ("name", "organizer__username", "description")
    ordering = ("-start_date",)
    
    # Use inlines to display related objects directly on the Event detail page
    inlines = [EventSpeakerInline, EventSponsorInline, RegistrationInline]
    
    # Custom fields for list_display
    def has_sponsors(self, obj):
        return obj.sponsors.exists()
    has_sponsors.boolean = True
    has_sponsors.short_description = 'Sponsors'
    
    def has_speakers(self, obj):
        return obj.speakers.exists()
    has_speakers.boolean = True
    has_speakers.short_description = 'Speakers'

@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "state", "capacity")
    search_fields = ("name", "city", "state")

@admin.register(Speaker)
class SpeakerAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "email", "organization")
    search_fields = ("first_name", "last_name", "email")

@admin.register(Sponsor)
class SponsorAdmin(admin.ModelAdmin):
    list_display = ("name", "contact_email", "website_url")
    search_fields = ("name", "contact_email")

@admin.register(Registration)
class RegistrationAdmin(admin.ModelAdmin):
    list_display = ("event", "user", "status", "registration_date")
    list_filter = ("status", "registration_date")
    search_fields = ("user__username", "event__name")