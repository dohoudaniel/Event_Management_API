from rest_framework import serializers
from .models import (
    Event, Venue, Speaker, Sponsor, Event_Speaker, Event_Sponsor,
    Registration, Category, Tag, Invitation, Notification
)
from django.conf import settings # Import settings to access BASE_URL

class VenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = '__all__'

class SpeakerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Speaker
        fields = '__all__'

class SponsorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sponsor
        fields = '__all__'

class EventSpeakerSerializer(serializers.ModelSerializer):
    speaker = serializers.StringRelatedField()
    class Meta:
        model = Event_Speaker
        fields = ['speaker', 'presentation_topic', 'presentation_start_time', 'presentation_end_time']

class EventSponsorSerializer(serializers.ModelSerializer):
    sponsor = serializers.StringRelatedField()
    class Meta:
        model = Event_Sponsor
        fields = ['sponsor', 'sponsorship_level', 'sponsorship_amount']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'
        read_only_fields = ['slug']

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = '__all__'
        read_only_fields = ['slug']

class RegistrationSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    event_name = serializers.CharField(source='event.name', read_only=True)
    
    class Meta:
        model = Registration
        fields = ['id', 'user', 'event', 'event_name', 'status', 'registration_date']
        read_only_fields = ['id', 'user', 'registration_date']

class InvitationSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(source='event.name', read_only=True)
    invited_by_username = serializers.CharField(source='invited_by.username', read_only=True)
    
    class Meta:
        model = Invitation
        fields = ['id', 'event', 'event_name', 'email', 'token', 'accepted', 'invited_by', 'invited_by_username', 'created_at', 'accepted_at']
        read_only_fields = ['id', 'token', 'accepted', 'invited_by', 'invited_by_username', 'created_at', 'accepted_at']

class NotificationSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(source='event.name', read_only=True)
    
    class Meta:
        model = Notification
        fields = ['id', 'user', 'message', 'event', 'event_name', 'read', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

class EventSerializer(serializers.ModelSerializer):
    organizer = serializers.StringRelatedField(read_only=True)
    venue = serializers.SlugRelatedField(
        slug_field='name',
        queryset=Venue.objects.all(),
        required=False,
        allow_null=True
    )
    categories = serializers.SlugRelatedField(
        many=True,
        slug_field='name',
        queryset=Category.objects.all()
    )
    tags = serializers.SlugRelatedField(
        many=True,
        slug_field='name',
        queryset=Tag.objects.all()
    )
    speakers = EventSpeakerSerializer(source='event_speakers', many=True, read_only=True)
    sponsors = EventSponsorSerializer(source='event_sponsors', many=True, read_only=True)
    
    class Meta:
        model = Event
        fields = [
            'id', 'organizer', 'name', 'slug', 'description', 'start_date', 'end_date',
            'start_time', 'end_time', 'venue', 'location_details', 'status',
            'max_attendees', 'ticket_price', 'is_private', # Added is_private
            'speakers', 'sponsors', 'categories', 'tags'
        ]
        read_only_fields = ['id', 'organizer', 'status', 'slug']