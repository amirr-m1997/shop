import uuid

from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from .models import UserProfile, LoginHistory
from orders.models import ShippingAddress
from orders.serializers import ShippingAddressSerializer


def _get_or_create_profile(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def _user_data(user):
    profile = _get_or_create_profile(user)
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name or profile.first_name,
        'last_name': user.last_name or profile.last_name,
        'phone': profile.phone,
        'date_of_birth': profile.date_of_birth,
        'phone_verified': profile.phone_verified,
        'email_verified': profile.email_verified,
        'date_joined': user.date_joined,
    }


# --- Auth ---

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    username = request.data.get('username', '').strip()
    email = request.data.get('email', '').strip()
    password = request.data.get('password', '')
    first_name = request.data.get('first_name', '').strip()
    last_name = request.data.get('last_name', '').strip()
    phone = request.data.get('phone', '').strip()

    if not username or not password:
        return Response({'error': 'نام کاربری و رمز عبور الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'این نام کاربری قبلاً استفاده شده است'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(
        username=username, email=email, password=password,
        first_name=first_name, last_name=last_name,
    )

    profile = _get_or_create_profile(user)
    if phone:
        profile.phone = phone
        profile.save()

    token, _ = Token.objects.get_or_create(user=user)

    # Record registration as first login
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    ip_address = x_forwarded.split(',')[0].strip() if x_forwarded else request.META.get('REMOTE_ADDR')
    LoginHistory.objects.create(
        user=user,
        ip_address=ip_address,
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
    )

    return Response({
        'token': token.key,
        'user': _user_data(user),
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')

    user = authenticate(username=username, password=password)
    if not user:
        return Response({'error': 'نام کاربری یا رمز عبور اشتباه است'}, status=status.HTTP_400_BAD_REQUEST)

    token, _ = Token.objects.get_or_create(user=user)

    # Record login history
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    ip_address = x_forwarded.split(',')[0].strip() if x_forwarded else request.META.get('REMOTE_ADDR')
    LoginHistory.objects.create(
        user=user,
        ip_address=ip_address,
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
    )

    # Delete login history older than 30 days
    cutoff = timezone.now() - timedelta(days=30)
    LoginHistory.objects.filter(user=user, login_time__lt=cutoff).delete()

    return Response({
        'token': token.key,
        'user': _user_data(user),
    })


# --- Profile ---

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_view(request):
    if request.method == 'GET':
        return Response(_user_data(request.user))

    # PUT - update profile
    data = request.data

    email = data.get('email', '').strip()
    if email and email != request.user.email:
        if User.objects.filter(email=email).exclude(id=request.user.id).exists():
            return Response({'error': 'این ایمیل قبلاً استفاده شده است'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.email = email

    first_name = data.get('first_name', '').strip()
    if first_name is not None:
        request.user.first_name = first_name

    last_name = data.get('last_name', '').strip()
    if last_name is not None:
        request.user.last_name = last_name

    request.user.save()

    profile = _get_or_create_profile(request.user)

    phone = data.get('phone', '').strip()
    if phone is not None:
        if phone != profile.phone:
            profile.phone = phone
            profile.phone_verified = False
        else:
            profile.phone = phone

    dob = data.get('date_of_birth')
    if dob is not None:
        profile.date_of_birth = dob if dob else None

    profile.save()

    return Response(_user_data(request.user))


# --- Verification ---

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_verification_view(request):
    verify_type = request.data.get('type', 'email')
    profile = _get_or_create_profile(request.user)

    if verify_type == 'phone':
        if not profile.phone:
            return Response({'error': 'شماره تلفن وارد نشده است'}, status=status.HTTP_400_BAD_REQUEST)
        code = profile.generate_verification_code('phone')
        # In production, send SMS here
        return Response({
            'message': 'کد تأیید ارسال شد',
        })

    elif verify_type == 'email':
        if not request.user.email:
            return Response({'error': 'ایمیل وارد نشده است'}, status=status.HTTP_400_BAD_REQUEST)
        code = profile.generate_verification_code('email')
        # In production, send email here
        return Response({
            'message': 'کد تأیید به ایمیل شما ارسال شد',
        })

    return Response({'error': 'نوع تأیید نامعتبر است'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_code_view(request):
    code = request.data.get('code', '').strip()
    verify_type = request.data.get('type', 'email')

    if not code:
        return Response({'error': 'کد تأیید الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

    profile = _get_or_create_profile(request.user)

    if profile.verification_code != code:
        return Response({'error': 'کد تأیید اشتباه است'}, status=status.HTTP_400_BAD_REQUEST)

    if profile.verification_type != verify_type:
        return Response({'error': 'نوع تأیید نامعتبر است'}, status=status.HTTP_400_BAD_REQUEST)

    if verify_type == 'phone':
        profile.phone_verified = True
    elif verify_type == 'email':
        profile.email_verified = True

    profile.verification_code = ''
    profile.verification_type = ''
    profile.save()

    return Response({'message': f'{"تلفن" if verify_type == "phone" else "ایمیل"} با موفقیت تأیید شد'})



# --- Password ---

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    old_password = request.data.get('old_password', '')
    new_password = request.data.get('new_password', '')

    if not old_password or not new_password:
        return Response({'error': 'رمز عبور فعلی و رمز عبور جدید الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

    if not request.user.check_password(old_password):
        return Response({'error': 'رمز عبور فعلی اشتباه است'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 6:
        return Response({'error': 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد'}, status=status.HTTP_400_BAD_REQUEST)

    request.user.set_password(new_password)
    request.user.save()

    Token.objects.filter(user=request.user).delete()
    token = Token.objects.create(user=request.user)

    return Response({'message': 'رمز عبور با موفقیت تغییر کرد', 'token': token.key})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    return Response(status=status.HTTP_204_NO_CONTENT)


# --- Password Reset ---

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request_view(request):
    email = request.data.get('email', '').strip()
    if not email:
        return Response({'error': 'ایمیل الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'message': 'اگر ایمیل شما در سیستم وجود داشته باشد، لینک بازیابی ارسال خواهد شد.'})

    token = uuid.uuid4().hex[:40]
    profile = _get_or_create_profile(user)
    profile.reset_token = token
    profile.save(update_fields=['reset_token'])

    return Response({
        'message': 'اگر ایمیل شما در سیستم وجود داشته باشد، لینک بازیابی ارسال خواهد شد.',
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    token = request.data.get('token', '').strip()
    new_password = request.data.get('new_password', '')

    if not token or not new_password:
        return Response({'error': 'توکن و رمز عبور جدید الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 6:
        return Response({'error': 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        profile = UserProfile.objects.get(reset_token=token[:40])
        user = profile.user
    except UserProfile.DoesNotExist:
        return Response({'error': 'توکن نامعتبر یا منقضی شده است'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()

    profile.reset_token = ''
    profile.save(update_fields=['reset_token'])

    new_token = Token.objects.create(user=user)

    return Response({
        'message': 'رمز عبور با موفقیت بازیابی شد',
        'token': new_token.key,
        'user': _user_data(user),
    })


# --- Login History ---

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

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def shipping_address_list_view(request):
    if request.method == 'GET':
        addresses = ShippingAddress.objects.filter(user=request.user)
        serializer = ShippingAddressSerializer(addresses, many=True)
        return Response(serializer.data)

    serializer = ShippingAddressSerializer(data=request.data)
    if serializer.is_valid():
        if serializer.validated_data.get('is_default'):
            ShippingAddress.objects.filter(
                user=request.user, is_default=True
            ).update(is_default=False)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def shipping_address_detail_view(request, pk):
    try:
        address = ShippingAddress.objects.get(id=pk, user=request.user)
    except ShippingAddress.DoesNotExist:
        return Response({'error': 'آدرس یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = ShippingAddressSerializer(address)
        return Response(serializer.data)

    if request.method == 'DELETE':
        address.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = ShippingAddressSerializer(address, data=request.data, partial=True)
    if serializer.is_valid():
        if serializer.validated_data.get('is_default'):
            ShippingAddress.objects.filter(
                user=request.user, is_default=True
            ).exclude(id=address.id).update(is_default=False)
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
