import uuid
import re
import logging

from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from .models import UserProfile, LoginHistory
from .throttles import (
    LoginThrottle, RegisterThrottle, SendOtpThrottle, VerifyOtpThrottle,
    ForgotPasswordThrottle, ResetPasswordThrottle,
)
from .security import (
    record_login_failure, clear_login_failures, is_account_locked,
    apply_login_delay, requires_captcha, validate_captcha,
    extract_device_fingerprint, log_security_event,
    record_otp_send, record_otp_failure, clear_otp_failures, is_otp_locked,
)
from shop.observability import (
    log_auth_success, log_auth_failure, log_auth_lockout,
    log_otp_request, log_otp_verification, log_password_reset,
)
from orders.models import ShippingAddress, Order
from orders.serializers import ShippingAddressSerializer

logger = logging.getLogger('authentication')

USERNAME_REGEX = re.compile(r'^[a-zA-Z][a-zA-Z0-9_]{2,29}$')
USERNAME_ERROR = 'نام کاربری فقط میتواند شامل حروف انگلیسی، اعداد و خط زیر (_) باشد و با یک حرف انگلیسی شروع شود.'


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
        'role': profile.role,
        'phone_verified': profile.phone_verified,
        'email_verified': profile.email_verified,
        'avatar': profile.avatar.url if profile.avatar else '',
        'date_joined': user.date_joined,
    }


def _get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    return x_forwarded.split(',')[0].strip() if x_forwarded else request.META.get('REMOTE_ADDR', 'unknown')


def _link_guest_orders_to_user(user):
    """Claim every unclaimed guest order that used this user's email."""
    if not user or not user.email:
        return 0

    from payments.models import Payment
    orders = Order.objects.filter(
        user__isnull=True,
        guest_email__iexact=user.email.strip(),
    )
    claimed = orders.count()
    for order in orders:
        order.user = user
        order.guest_email = None
        order.guest_phone = None
        order.guest_session_id = None
        order.save(update_fields=['user', 'guest_email', 'guest_phone', 'guest_session_id', 'updated_at'])
        Payment.objects.filter(order=order, user__isnull=True).update(user=user)
        address = order.shipping_address
        if address and not address.user_id:
            address.user = user
            address.save(update_fields=['user', 'updated_at'])

    if claimed:
        logger.info(
            '[guest_orders_linked] user=%s user_id=%d count=%d',
            user.username, user.id, claimed,
        )
    return claimed


# --- Auth ---

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegisterThrottle])
def register_view(request):

    username = request.data.get('username', '').strip()
    email = request.data.get('email', '').strip()
    password = request.data.get('password', '')
    first_name = request.data.get('first_name', '').strip()
    last_name = request.data.get('last_name', '').strip()
    phone = request.data.get('phone', '').strip()

    if not username or not password:
        return Response({'error': 'نام کاربری و رمز عبور الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

    if not USERNAME_REGEX.match(username):
        return Response({'error': USERNAME_ERROR}, status=status.HTTP_400_BAD_REQUEST)

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

    _link_guest_orders_to_user(user)

    token, _ = Token.objects.get_or_create(user=user)

    # Record registration as first login
    ip_address = _get_client_ip(request)
    LoginHistory.objects.create(
        user=user,
        ip_address=ip_address,
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
    )

    log_auth_success(username, user.id, ip_address, method='register')
    logger.info(
        '[register_success] user=%s user_id=%d ip=%s',
        username, user.id, ip_address,
    )

    return Response({
        'token': token.key,
        'user': _user_data(user),
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegisterThrottle])
def guest_register_view(request):

    email = request.data.get('email', '').strip().lower()
    password = request.data.get('password', '')
    order_number = request.data.get('order_number', '').strip()

    if not password:
        return Response(
            {'error': 'رمز عبور الزامی است'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(password) < 6:
        return Response(
            {'error': 'رمز عبور باید حداقل ۶ کاراکتر باشد'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not order_number:
        return Response(
            {'error': 'شماره سفارش الزامی است'},
            status=status.HTTP_400_BAD_REQUEST
        )

    order = Order.objects.filter(
        order_number=order_number,
        guest_email__isnull=False,
        user__isnull=True,
    ).first()
    if not order:
        return Response(
            {'error': 'سفارش مهمان با این مشخصات یافت نشد.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Email comes from the guest order; a provided email must match it.
    email = email or (order.guest_email or '').strip().lower()
    if order.guest_email and order.guest_email.lower() != email:
        return Response(
            {'error': 'ایمیل وارد شده با ایمیل ثبت‌شده در سفارش مطابقت ندارد.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(email=email).exists() or User.objects.filter(username=email).exists():
        return Response(
            {'error': 'حسابی با این ایمیل از قبل وجود دارد. لطفاً وارد شوید.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = User.objects.create_user(
        username=email, email=email, password=password,
    )
    _get_or_create_profile(user)

    # Link the matched order and any other guest orders with the same email
    _link_guest_orders_to_user(user)

    token, _ = Token.objects.get_or_create(user=user)

    ip_address = _get_client_ip(request)
    LoginHistory.objects.create(
        user=user,
        ip_address=ip_address,
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
    )

    log_auth_success(email, user.id, ip_address, method='guest_register')
    logger.info(
        '[guest_register_success] user=%s user_id=%d order=%s ip=%s',
        email, user.id, order_number, ip_address,
    )

    return Response({
        'token': token.key,
        'user': _user_data(user),
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def login_view(request):

    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    captcha_response = request.data.get('captcha', '')
    device_fingerprint = request.data.get('device_fingerprint', '')

    if not username:
        return Response({'error': 'نام کاربری الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

    # Identifier for lockout: username + IP
    ip_address = _get_client_ip(request)
    identifier = username.lower()
    ip_identifier = ip_address

    # Check account lockout (by username)
    if is_account_locked(identifier):
        log_security_event('login_blocked_lockout', request, f'user={username}')
        log_auth_lockout(identifier, lock_type='account')
        return Response(
            {'error': 'حساب شما به‌صورت موقت قفل شده است. لطفاً ۵ دقیقه صبر کنید یا با پشتیبانی سایت تماس بگیرید.'},
            status=status.HTTP_423_LOCKED,
        )

    # Check IP lockout
    if is_account_locked(ip_identifier):
        log_security_event('login_blocked_ip_lockout', request, f'user={username}')
        log_auth_lockout(ip_identifier, lock_type='ip')
        return Response(
            {'error': 'تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً ۵ دقیقه صبر کنید یا با پشتیبانی سایت تماس بگیرید.'},
            status=status.HTTP_423_LOCKED,
        )

    # Check CAPTCHA requirement
    if requires_captcha(identifier):
        valid, err = validate_captcha(captcha_response, '')
        if not valid:
            log_security_event('login_captcha_failed', request, f'user={username}')
            return Response(
                {'error': err, 'captcha_required': True},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # Apply progressive delay
    apply_login_delay(identifier)

    # Attempt authentication
    user = authenticate(username=username, password=password)
    if not user:
        fail_count = record_login_failure(identifier)
        record_login_failure(ip_identifier)

        log_security_event('login_failure', request, f'user={username}, count={fail_count}')
        log_auth_failure(username, ip_address, fail_count=fail_count)

        if fail_count >= 10:
            log_auth_lockout(identifier, lock_type='account', duration=300)
            return Response(
                {'error': 'حساب شما به‌صورت موقت قفل شده است. لطفاً ۵ دقیقه صبر کنید یا با پشتیبانی سایت تماس بگیرید.'},
                status=status.HTTP_423_LOCKED,
            )
        if fail_count >= 5:
            return Response(
                {'error': 'نام کاربری یا رمز عبور اشتباه است.', 'captcha_required': True},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'error': 'نام کاربری یا رمز عبور اشتباه است'}, status=status.HTTP_400_BAD_REQUEST)

    # Success — clear failures
    clear_login_failures(identifier)
    clear_login_failures(ip_identifier)

    _link_guest_orders_to_user(user)

    token, _ = Token.objects.get_or_create(user=user)

    # Record login history
    LoginHistory.objects.create(
        user=user,
        ip_address=ip_address,
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
    )

    # Delete login history older than 30 days
    cutoff = timezone.now() - timedelta(days=30)
    LoginHistory.objects.filter(user=user, login_time__lt=cutoff).delete()

    log_auth_success(username, user.id, ip_address, method='login')
    logger.info(
        '[login_success] user=%s user_id=%d ip=%s',
        username, user.id, ip_address,
    )

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

    _link_guest_orders_to_user(request.user)

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

    # Avatar upload (multipart/form-data) or explicit removal ("" / null).
    if 'avatar' in data:
        avatar = data.get('avatar')
        if avatar in ('', None):
            if profile.avatar:
                profile.avatar.delete(save=False)
            profile.avatar = None
        elif getattr(avatar, 'size', None) is not None:
            # Validate image type / size before replacing the old avatar.
            content_type = getattr(avatar, 'content_type', '') or ''
            if not content_type.startswith('image/'):
                return Response({'error': 'فقط فایل تصویری مجاز است.'}, status=status.HTTP_400_BAD_REQUEST)
            if avatar.size > settings.MAX_AVATAR_SIZE:
                return Response(
                    {'error': f'حجم تصویر نباید بیشتر از {settings.MAX_AVATAR_SIZE // (1024 * 1024)} مگابایت باشد.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if profile.avatar:
                profile.avatar.delete(save=False)
            profile.avatar = avatar

    profile.save()

    return Response(_user_data(request.user))


# --- Verification ---

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([SendOtpThrottle])
def send_verification_view(request):

    verify_type = request.data.get('type', 'email')
    profile = _get_or_create_profile(request.user)
    ip_address = _get_client_ip(request)

    # Check OTP lockout
    lock_id = f'{request.user.id}:{verify_type}'
    if is_otp_locked(lock_id):
        log_security_event('otp_send_blocked', request, f'user={request.user.username}')
        return Response(
            {'error': 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً ۵ دقیقه صبر کنید یا با پشتیبانی سایت تماس بگیرید.'},
            status=status.HTTP_423_LOCKED,
        )

    # Track OTP sends
    send_count = record_otp_send(lock_id)
    if send_count > 5:
        log_security_event('otp_abuse', request, f'user={request.user.username}, sends={send_count}')

    if verify_type == 'phone':
        if not profile.phone:
            return Response({'error': 'شماره تلفن وارد نشده است'}, status=status.HTTP_400_BAD_REQUEST)
        code = profile.generate_verification_code('phone')
        log_otp_request(request.user.id, 'phone', ip_address, success=True)
        logger.info(
            '[otp_sent] user=%s type=phone ip=%s',
            request.user.username, ip_address,
        )
        # TODO: اتصال سرویس پیامک (مثلاً کاوه‌نگار)
        response_data = {'message': 'کد تأیید ارسال شد'}
        if settings.DEBUG:
            response_data['code'] = code
        return Response(response_data)

    elif verify_type == 'email':
        if not request.user.email:
            return Response({'error': 'ایمیل وارد نشده است'}, status=status.HTTP_400_BAD_REQUEST)
        code = profile.generate_verification_code('email')
        try:
            send_mail(
                subject='کد تأیید ایمیل — فروشگاه مد',
                message=f'کد تأیید شما: {code}\n\nاین کد تا ۱۰ دقیقه معتبر است.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[request.user.email],
                fail_silently=False,
            )
            log_otp_request(request.user.id, 'email', ip_address, success=True)
            logger.info(
                '[otp_sent] user=%s type=email ip=%s',
                request.user.username, ip_address,
            )
        except Exception as e:
            log_otp_request(request.user.id, 'email', ip_address, success=False)
            logger.error(
                '[otp_send_failed] user=%s type=email ip=%s error=%s',
                request.user.username, ip_address, str(e),
            )
            return Response(
                {'error': f'خطا در ارسال ایمیل: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response({
            'message': 'کد تأیید به ایمیل شما ارسال شد',
        })

    return Response({'error': 'نوع تأیید نامعتبر است'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([VerifyOtpThrottle])
def verify_code_view(request):

    code = request.data.get('code', '').strip()
    verify_type = request.data.get('type', 'email')

    if not code:
        return Response({'error': 'کد تأیید الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

    # Check OTP lockout
    lock_id = f'{request.user.id}:{verify_type}'
    if is_otp_locked(lock_id):
        log_security_event('otp_verify_blocked', request, f'user={request.user.username}')
        return Response(
            {'error': 'تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً ۵ دقیقه صبر کنید یا با پشتیبانی سایت تماس بگیرید.'},
            status=status.HTTP_423_LOCKED,
        )

    profile = _get_or_create_profile(request.user)

    if profile.verification_code != code:
        fail_count = record_otp_failure(lock_id)
        log_security_event('otp_verify_failure', request, f'user={request.user.username}, count={fail_count}')
        log_otp_verification(request.user.id, verify_type, success=False,
                             ip=_get_client_ip(request), fail_count=fail_count)
        return Response({'error': 'کد تأیید اشتباه است'}, status=status.HTTP_400_BAD_REQUEST)

    if profile.verification_type != verify_type:
        return Response({'error': 'نوع تأیید نامعتبر است'}, status=status.HTTP_400_BAD_REQUEST)

    if profile.verification_code_expired:
        clear_otp_failures(lock_id)
        profile.verification_code = ''
        profile.verification_type = ''
        profile.save(update_fields=['verification_code', 'verification_type'])
        log_security_event('otp_verify_expired', request, f'user={request.user.username}')
        return Response({'error': 'کد تأیید منقضی شده است. لطفاً کد جدید درخواست کنید.'}, status=status.HTTP_400_BAD_REQUEST)

    # Success — clear OTP failures
    clear_otp_failures(lock_id)

    if verify_type == 'phone':
        profile.phone_verified = True
    elif verify_type == 'email':
        profile.email_verified = True

    profile.verification_code = ''
    profile.verification_type = ''
    profile.save()

    log_otp_verification(request.user.id, verify_type, success=True, ip=_get_client_ip(request))
    logger.info(
        '[otp_verified] user=%s type=%s ip=%s',
        request.user.username, verify_type, _get_client_ip(request),
    )

    return Response({'message': f'{"تلفن" if verify_type == "phone" else "ایمیل"} با موفقیت تأیید شد'})



# --- Password ---

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    old_password = request.data.get('old_password', '')
    new_password = request.data.get('new_password', '')
    ip_address = _get_client_ip(request)

    if not old_password or not new_password:
        return Response({'error': 'رمز عبور فعلی و رمز عبور جدید الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

    if not request.user.check_password(old_password):
        log_auth_failure(request.user.username, ip_address, reason='wrong_password')
        return Response({'error': 'رمز عبور فعلی اشتباه است'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 6:
        return Response({'error': 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد'}, status=status.HTTP_400_BAD_REQUEST)

    request.user.set_password(new_password)
    request.user.save()

    Token.objects.filter(user=request.user).delete()
    token = Token.objects.create(user=request.user)

    log_password_reset(request.user.id, ip_address, method='change')
    logger.info(
        '[password_changed] user=%s user_id=%d ip=%s',
        request.user.username, request.user.id, ip_address,
    )

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
@throttle_classes([ForgotPasswordThrottle])
def password_reset_request_view(request):

    email = request.data.get('email', '').strip()
    ip_address = _get_client_ip(request)
    if not email:
        return Response({'error': 'ایمیل الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        logger.info(
            '[password_reset_not_found] email=%s ip=%s',
            email[:3] + '***', ip_address,
        )
        return Response({'message': 'اگر ایمیل شما در سیستم وجود داشته باشد، لینک بازیابی ارسال خواهد شد.'})

    token = uuid.uuid4().hex[:40]
    profile = _get_or_create_profile(user)
    profile.reset_token = token
    profile.reset_token_created_at = timezone.now()
    profile.save(update_fields=['reset_token', 'reset_token_created_at'])

    reset_link = f'{settings.FRONTEND_URL}/reset-password?token={token}'

    try:
        send_mail(
            subject='بازیابی رمز عبور — فروشگاه مد',
            message=(
                f'سلام {user.get_full_name() or user.username},\n\n'
                f'برای بازیابی رمز عبور روی لینک زیر کلیک کنید:\n\n'
                f'{reset_link}\n\n'
                f'این لینک تا ۲۴ ساعت معتبر است.\n'
                f'اگر شما این درخواست را نداده‌اید، این ایمیل را نادیده بگیرید.'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        log_password_reset(user.id, ip_address, method='request')
        logger.info(
            '[password_reset_requested] user=%s user_id=%d ip=%s',
            user.username, user.id, ip_address,
        )
    except Exception as e:
        logger.error(
            '[password_reset_email_failed] user=%s ip=%s error=%s',
            user.username, ip_address, str(e),
        )
        return Response(
            {'error': f'خطا در ارسال ایمیل: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response({
        'message': 'لینک بازیابی رمز عبور به ایمیل شما ارسال شد.',
    })


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ResetPasswordThrottle])
def password_reset_confirm_view(request):

    token = request.data.get('token', '').strip()
    new_password = request.data.get('new_password', '')
    ip_address = _get_client_ip(request)

    if not token or not new_password:
        return Response({'error': 'توکن و رمز عبور جدید الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 6:
        return Response({'error': 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        profile = UserProfile.objects.get(reset_token=token[:40])
        user = profile.user
    except UserProfile.DoesNotExist:
        logger.warning(
            '[password_reset_invalid_token] ip=%s',
            ip_address,
        )
        return Response({'error': 'توکن نامعتبر یا منقضی شده است'}, status=status.HTTP_400_BAD_REQUEST)

    if profile.reset_token_expired:
        profile.reset_token = ''
        profile.reset_token_created_at = None
        profile.save(update_fields=['reset_token', 'reset_token_created_at'])
        logger.warning(
            '[password_reset_expired_token] user=%s ip=%s',
            user.username, ip_address,
        )
        return Response({'error': 'توکن نامعتبر یا منقضی شده است'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()

    profile.reset_token = ''
    profile.save(update_fields=['reset_token'])

    new_token = Token.objects.create(user=user)

    log_password_reset(user.id, ip_address, method='confirm')
    logger.info(
        '[password_reset_success] user=%s user_id=%d ip=%s',
        user.username, user.id, ip_address,
    )

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
