from django.urls import path
from . import views

app_name = 'events'

urlpatterns = [
    # Event URLs
    path('', views.EventListCreateView.as_view(), name='event-list-create'),
    path('<slug:slug>/', views.EventRetrieveUpdateDestroyView.as_view(), name='event-detail'),
    path('<slug:slug>/register/', views.EventRegistrationView.as_view(), name='event-register'),
    path('<slug:slug>/invitations/', views.InvitationSendView.as_view(), name='event-send-invitation'),

    # Invitation Accept URL (doesn't need to be nested under an event)
    path('invitations/accept/<uuid:token>/', views.InvitationAcceptView.as_view(), name='invitation-accept'),

    # Venue URLs
    path('venues/', views.VenueListCreateView.as_view(), name='venue-list-create'),
    path('venues/<int:pk>/', views.VenueRetrieveUpdateDestroyView.as_view(), name='venue-detail'),

    # Speaker URLs
    path('speakers/', views.SpeakerListCreateView.as_view(), name='speaker-list-create'),
    path('speakers/<int:pk>/', views.SpeakerRetrieveUpdateDestroyView.as_view(), name='speaker-detail'),

    # Sponsor URLs
    path('sponsors/', views.SponsorListCreateView.as_view(), name='sponsor-list-create'),
    path('sponsors/<int:pk>/', views.SponsorRetrieveUpdateDestroyView.as_view(), name='sponsor-detail'),

    # Category & Tag URLs
    path('categories/', views.CategoryListCreateView.as_view(), name='category-list-create'),
    path('tags/', views.TagListCreateView.as_view(), name='tag-list-create'),
]