# This file contains the API views for all event-related entities,
# including events, venues, speakers, sponsors, categories, tags,
# registrations, invitations, and notifications.
#
from rest_framework import generics, status, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError
from drf_spectacular.utils import extend_schema, OpenApiResponse
from drf_spectacular.types import OpenApiTypes

from django.db.models import Q
from django.utils import timezone

# For full-text search (PostgreSQL specific, but 'icontains' is for SQLite/general)
# from django.contrib.postgres.search import SearchVector # Uncomment if using PostgreSQL

from .models import (
    Event, Venue, Speaker, Sponsor, Category, Tag, Registration, Invitation, Notification
)
from .serializers import (
    EventSerializer, VenueSerializer, SpeakerSerializer,
    CategorySerializer, TagSerializer, RegistrationSerializer,
    InvitationSerializer, NotificationSerializer, SponsorSerializer
)
from .tasks import send_invitation_email_task # Import your Celery task

# --- Permission Class ---
class IsOrganizer(IsAuthenticated):
    """
    Custom permission to only allow organizers to perform certain actions (e.g., create events).
    """
    def has_permission(self, request, view):
        # A user must be authenticated and have the 'organizer' role
        return request.user.is_authenticated and request.user.role == 'organizer'

# --- Pagination ---
from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

# --- Event Views ---
class EventListCreateView(generics.ListCreateAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination
    ordering = ['-created_at'] # Add default ordering to prevent pagination warnings

    def get_queryset(self):
        queryset = Event.objects.all()
        
        # --- Full-Text Search ---
        search_query = self.request.query_params.get('search', None)
        if search_query:
            # For PostgreSQL FTS (uncomment and install psycopg2 if using PostgreSQL)
            # queryset = queryset.annotate(
            #    search=SearchVector('name', 'description', 'location_details', 'venue__name')
            # ).filter(search=search_query)
            
            # For general database (SQLite, MySQL etc.) using Q objects
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(location_details__icontains=search_query) |
                Q(venue__name__icontains=search_query) # Search by venue name
            ).distinct() # Use distinct to avoid duplicate results if an event matches multiple conditions

        # Filtering by date
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(start_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(end_date__lte=end_date)
            
        # Filtering by location (venue city/state)
        city = self.request.query_params.get('city')
        state = self.request.query_params.get('state')
        if city:
            queryset = queryset.filter(venue__city__icontains=city)
        if state:
            queryset = queryset.filter(venue__state__icontains=state)

        # Filtering by organizer username
        organizer_username = self.request.query_params.get('organizer')
        if organizer_username:
            queryset = queryset.filter(organizer__username__icontains=organizer_username)
            
        # Filtering by category slug
        category_slug = self.request.query_params.get('category')
        if category_slug:
            queryset = queryset.filter(categories__slug=category_slug)
            
        # Filtering by tag slug
        tag_slug = self.request.query_params.get('tag')
        if tag_slug:
            queryset = queryset.filter(tags__slug=tag_slug)

        # Filtering by public/private events
        # Unauthenticated users only see public events
        if not self.request.user.is_authenticated:
            queryset = queryset.filter(is_private=False)
        else:
            # Authenticated users see public events, events they organized,
            # or private events they have an accepted invitation for.
            queryset = queryset.filter(
                Q(is_private=False) |
                Q(organizer=self.request.user) |
                Q(invitations__email=self.request.user.email, invitations__accepted=True)
            ).distinct() # Use distinct to prevent duplicate events if multiple conditions apply

        return queryset

    def perform_create(self, serializer):
        # Only organizers can create events
        if self.request.user.role == 'organizer':
            serializer.save(organizer=self.request.user)
        else:
            raise PermissionDenied("Only organizers can create events.")

class EventRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    lookup_field = 'slug'  # Use slug for URL lookup
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_object(self):
        try:
            event = Event.objects.get(slug=self.kwargs['slug'])
        except Event.DoesNotExist:
            raise NotFound("An event with that slug does not exist.")
        
        # Permissions for private events
        if event.is_private:
            if not self.request.user.is_authenticated:
                raise PermissionDenied("Authentication required to view this private event.")
            
            # Organizer always has access
            if self.request.user == event.organizer:
                return event
            
            # Check if user has an accepted invitation
            if Invitation.objects.filter(event=event, email=self.request.user.email, accepted=True).exists():
                return event
                
            raise PermissionDenied("You do not have permission to view this private event.")
            
        return event

    def perform_update(self, serializer):
        # Only the event's organizer can update it
        if self.request.user == self.get_object().organizer:
            serializer.save()
        else:
            raise PermissionDenied("You do not have permission to edit this event.")

    def perform_destroy(self, instance):
        # Only the event's organizer can delete it
        if self.request.user == instance.organizer:
            instance.delete()
        else:
            raise PermissionDenied("You do not have permission to delete this event.")

# --- Registration Views ---
@extend_schema(
    summary="Register for an Event",
    description="Registers the authenticated user for a specific event.",
    responses={
        201: RegistrationSerializer,
        404: OpenApiResponse(description="Event not found."),
        409: OpenApiResponse(description="You are already registered for this event."),
        403: OpenApiResponse(description="You do not have permission to register for this private event."),
    },
    tags=['Events']
)
class EventRegistrationView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = RegistrationSerializer # Helps drf-spectacular generate the schema

    def post(self, request, slug, format=None):
        try:
            event = Event.objects.get(slug=slug)
        except Event.DoesNotExist:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check for private events: user must be organizer or have accepted invite
        if event.is_private:
            if request.user != event.organizer and \
               not Invitation.objects.filter(event=event, email=request.user.email, accepted=True).exists():
                raise PermissionDenied("You do not have permission to register for this private event.")

        # Check if the user is already registered for this event
        if Registration.objects.filter(event=event, user=request.user).exists():
            return Response({"detail": "You are already registered for this event."}, status=status.HTTP_409_CONFLICT)
        
        # Create a new registration
        registration = Registration.objects.create(event=event, user=request.user)
        serializer = RegistrationSerializer(registration)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# --- Venue Views ---
class VenueListCreateView(generics.ListCreateAPIView):
    queryset = Venue.objects.all()
    serializer_class = VenueSerializer
    permission_classes = [IsAuthenticatedOrReadOnly] # Consider if only organizers can add venues

class VenueRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Venue.objects.all()
    serializer_class = VenueSerializer
    permission_classes = [IsAuthenticatedOrReadOnly] # Consider if only organizers can edit/delete venues

# --- Speaker Views ---
class SpeakerListCreateView(generics.ListCreateAPIView):
    queryset = Speaker.objects.all()
    serializer_class = SpeakerSerializer
    permission_classes = [IsAuthenticatedOrReadOnly] # Consider if only organizers can add speakers

class SpeakerRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Speaker.objects.all()
    serializer_class = SpeakerSerializer
    permission_classes = [IsAuthenticatedOrReadOnly] # Consider if only organizers can edit/delete speakers

# --- Sponsor Views ---
class SponsorListCreateView(generics.ListCreateAPIView):
    queryset = Sponsor.objects.all()
    serializer_class = SponsorSerializer
    permission_classes = [IsAuthenticatedOrReadOnly] # Consider if only organizers can add sponsors

class SponsorRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Sponsor.objects.all()
    serializer_class = SponsorSerializer
    permission_classes = [IsAuthenticatedOrReadOnly] # Consider if only organizers can edit/delete sponsors

# --- Category & Tag Views ---
class CategoryListCreateView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
class TagListCreateView(generics.ListCreateAPIView):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


# --- Invitation Views ---
class InvitationRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True, help_text="Email address of the user to invite.")

@extend_schema(
    summary="Send an Invitation",
    description="Sends an invitation to a user's email to join a private event. Only the event organizer can perform this action.",
    request=InvitationRequestSerializer,
    responses={
        202: InvitationSerializer,
        400: OpenApiResponse(description="Bad Request (e.g., email missing, event is not private)."),
        404: OpenApiResponse(description="Event not found."),
        403: OpenApiResponse(description="You do not have permission to send invitations."),
        409: OpenApiResponse(description="An invitation has already been sent to this email."),
    },
    tags=['Events']
)
class InvitationSendView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, slug):
        try:
            event = Event.objects.get(slug=slug)
        except Event.DoesNotExist:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)
        
        if request.user != event.organizer:
            raise PermissionDenied("You do not have permission to send invitations for this event.")
        
        if not event.is_private:
            return Response({"detail": "Invitations can only be sent for private events."}, status=status.HTTP_400_BAD_REQUEST)

        email = request.data.get('email')
        if not email:
            raise ValidationError({"email": "Email is required."})

        if Invitation.objects.filter(event=event, email=email).exists():
            return Response({"detail": "An invitation has already been sent to this email for this event."}, status=status.HTTP_409_CONFLICT)

        invitation = Invitation.objects.create(event=event, email=email, invited_by=request.user)
        
        # Send the invitation email asynchronously using Celery
        send_invitation_email_task.delay(str(invitation.id))
        
        serializer = InvitationSerializer(invitation)
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

@extend_schema(
    summary="Accept an Invitation",
    description="Accepts an event invitation using a unique token. This endpoint is public.",
    request=None,
    responses={
        200: OpenApiResponse(description="Invitation accepted successfully."),
        404: OpenApiResponse(description="Invalid or expired invitation token, or invitation already accepted."),
    },
    tags=['Events']
)
class InvitationAcceptView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, token):
        try:
            invitation = Invitation.objects.get(token=token, accepted=False)
        except Invitation.DoesNotExist:
            return Response({"detail": "Invalid or expired invitation token, or invitation already accepted."}, status=status.HTTP_404_NOT_FOUND)

        invitation.accepted = True
        invitation.accepted_at = timezone.now()
        invitation.save()

        # Optional: Automatically register the user if they are authenticated and their email matches
        # if request.user.is_authenticated and request.user.email == invitation.email:
        #     Registration.objects.get_or_create(event=invitation.event, user=request.user)
        #     return Response({"detail": "Invitation accepted and you are registered for the event!"}, status=status.HTTP_200_OK)

        return Response({"detail": f"Invitation for {invitation.event.name} accepted! Please log in or register with {invitation.email} to proceed."}, status=status.HTTP_200_OK)


# --- Notification Views ---
class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        # Only retrieve notifications for the authenticated user
        return Notification.objects.filter(user=self.request.user)

@extend_schema(
    summary="Mark Notification as Read",
    description="Marks a specific notification as read for the authenticated user.",
    request=None,
    responses={
        200: OpenApiResponse(description="Notification marked as read."),
        404: OpenApiResponse(description="Notification not found or you don't have permission."),
    },
    tags=['Notifications']
)
class NotificationMarkAsReadView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
            notification.read = True
            notification.save()
            return Response({"detail": "Notification marked as read."}, status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response({"detail": "Notification not found or you don't have permission."}, status=status.HTTP_404_NOT_FOUND)