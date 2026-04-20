from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from drf_spectacular.utils import extend_schema
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes

@extend_schema(
    summary="API Health Check",
    description="Checks the operational status of the API. Returns a simple JSON object indicating the API is running.",
    responses={200: OpenApiTypes.OBJECT},
    tags=['Health']
)
class HealthCheckView(APIView):
    """
    API view for a health check endpoint.
    
    This endpoint can be used to monitor the status of the API and
    ensure that it is up and running.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, *args, **kwargs):
        """
        Handles the GET request for the health check.
        """
        response_data = {
            "status": "ok",
            "message": "Event Management API is operational!",
            "version": "1.0.0",
            "timestamp": timezone.now().isoformat()
        }
        return Response(response_data, status=status.HTTP_200_OK)
