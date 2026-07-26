from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register_view),
    path('login/', views.login_view),
    path('logout/', views.logout_view),
    path('user/', views.user_view),
    path('change-password/', views.change_password_view),
    path('password-reset/', views.password_reset_request_view),
    path('password-reset-confirm/', views.password_reset_confirm_view),
    path('send-verification/', views.send_verification_view),
    path('verify-code/', views.verify_code_view),
    path('login-history/', views.login_history_view),
    path('addresses/', views.shipping_address_list_view),
    path('addresses/<int:pk>/', views.shipping_address_detail_view),
]
