from django.conf import settings
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from shop.observability import set_authenticated_user_context


class CookieTokenAuthentication(TokenAuthentication):
    """Authenticate HttpOnly cookie clients and legacy Authorization headers."""

    def authenticate(self, request):
        header_result = super().authenticate(request)
        if header_result is not None:
            set_authenticated_user_context(header_result[0].username)
            return header_result
        token = request.COOKIES.get(settings.AUTH_TOKEN_COOKIE_NAME)
        if not token:
            return None
        result = self.authenticate_credentials(token)
        SessionAuthentication().enforce_csrf(request)
        set_authenticated_user_context(result[0].username)
        return result
