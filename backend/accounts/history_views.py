from datetime import timedelta

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import LoginHistory


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def login_history_view(request):
    # Delete old entries first
    cutoff = timezone.now() - timedelta(days=30)
    LoginHistory.objects.filter(user=request.user, login_time__lt=cutoff).delete()

    history = LoginHistory.objects.filter(user=request.user)[:50]
    data = []
    for entry in history:
        data.append({
            'id': entry.id,
            'ip_address': entry.ip_address or 'نامشخص',
            'user_agent': entry.user_agent or 'نامشخص',
            'login_time': entry.login_time.isoformat(),
        })
    return Response(data)


# --- Shipping Addresses ---

