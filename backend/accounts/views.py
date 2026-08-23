import uuid
import re
import logging

from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
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
    get_login_retry_after, requires_captcha, validate_captcha,
    extract_device_fingerprint, log_security_event,
    record_otp_send, record_otp_failure, clear_otp_failures, is_otp_locked,
)
from shop.observability import (
    log_auth_success, log_auth_failure, log_auth_lockout,
    log_otp_request, log_otp_verification, log_password_reset,
    set_authenticated_user_context,
)
from orders.models import ShippingAddress, Order
from orders.serializers import ShippingAddressSerializer
from shop.client_ip import get_client_ip
from .delivery import OTPDeliveryError, deliver_phone_otp, queue_email
from loyalty.services import (
    REFERRAL_COOKIE_NAME,
    award_referral_registration_rewards, award_verified_registration_reward,
    claim_referral_attribution_from_request,
)

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
        'style_preferences': profile.style_preferences or [],
        'date_joined': user.date_joined,
    }


def _validate_new_password(password, user=None):
    try:
        validate_password(password, user=user)
    except ValidationError as exc:
        return ' '.join(exc.messages)
    return None


def _set_auth_cookie(response, token):
    response.set_cookie(
        settings.AUTH_TOKEN_COOKIE_NAME, token.key,
        max_age=settings.AUTH_TOKEN_COOKIE_MAX_AGE,
        httponly=True, secure=settings.AUTH_TOKEN_COOKIE_SECURE,
        samesite=settings.AUTH_TOKEN_COOKIE_SAMESITE, path='/',
    )
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_cookie_view(request):
    return Response({'detail': 'CSRF cookie set'})


def _normalize_email(email):
    """Return the canonical representation enforced by the database index."""
    return (email or '').strip().lower()


def _link_guest_orders_to_user(user, guest_session_id):
    """Claim guest orders only after proving email and browser-session ownership."""
    if not user or not user.email or not guest_session_id:
        return 0
    profile = _get_or_create_profile(user)
    if not profile.email_verified:
        return 0

    from payments.models import Payment
    orders = Order.objects.filter(
        user__isnull=True,
        guest_email__iexact=_normalize_email(user.email),
        guest_session_id=guest_session_id,
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

    email = _normalize_email(email)
    if email:
        try:
            validate_email(email)
        except ValidationError:
            return Response({'error': 'ایمیل معتبر نیست'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=email).exists():
            return Response({'error': 'این ایمیل قبلاً استفاده شده است'}, status=status.HTTP_400_BAD_REQUEST)
    password_error = _validate_new_password(password)
    if password_error:
        return Response({'error': password_error}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=username, email=email, password=password,
                first_name=first_name, last_name=last_name,
            )
            claim_referral_attribution_from_request(request=request, user=user)
    except IntegrityError:
        return Response(
            {'error': 'نام کاربری یا ایمیل قبلاً استفاده شده است'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    profile = _get_or_create_profile(user)
    if phone:
        profile.phone = phone
        profile.save()

    token, _ = Token.objects.get_or_create(user=user)

    # Record registration as first login
    ip_address = get_client_ip(request)
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

    response = _set_auth_cookie(Response({
        'token': token.key,
        'user': _user_data(user),
    }, status=status.HTTP_201_CREATED), token)
    # Registration consumes any signed attribution, including invalid/stale values.
    response.delete_cookie(REFERRAL_COOKIE_NAME, samesite='Lax')
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegisterThrottle])
def guest_register_view(request):

    email = _normalize_email(request.data.get('email', ''))
    password = request.data.get('password', '')
    order_number = request.data.get('order_number', '').strip()

    if not password:
        return Response(
            {'error': 'رمز عبور الزامی است'},
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

    session_id = request.META.get('HTTP_X_SESSION_ID', '').strip()
    if not session_id or not order.guest_session_id or order.guest_session_id != session_id:
        return Response(
            {'error': 'نشست ثبت این سفارش معتبر نیست. ایجاد حساب را از همان مرورگر تکمیل کنید.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    if User.objects.filter(email__iexact=email).exists() or User.objects.filter(username=email).exists():
        return Response(
            {'error': 'حسابی با این ایمیل از قبل وجود دارد. لطفاً وارد شوید.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    password_error = _validate_new_password(password)
    if password_error:
        return Response({'error': password_error}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=email, email=email, password=password,
            )
    except IntegrityError:
        return Response(
            {'error': 'حسابی با این ایمیل از قبل وجود دارد. لطفاً وارد شوید.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    _get_or_create_profile(user)

    token, _ = Token.objects.get_or_create(user=user)

    ip_address = get_client_ip(request)
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

    return _set_auth_cookie(Response({
        'token': token.key,
        'user': _user_data(user),
    }, status=status.HTTP_201_CREATED), token)


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
    ip_address = get_client_ip(request)
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
        valid, err = validate_captcha(captcha_response, ip_address)
        if not valid:
            log_security_event('login_captcha_failed', request, f'user={username}')
            return Response(
                {'error': err, 'captcha_required': True},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # Reject during progressive cooldown without blocking a server worker.
    retry_after = get_login_retry_after(identifier)
    if retry_after:
        response = Response(
            {'error': 'لطفاً پیش از تلاش مجدد کمی صبر کنید.', 'retry_after': retry_after},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )
        response['Retry-After'] = str(retry_after)
        return response

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

    _link_guest_orders_to_user(
        user, request.META.get('HTTP_X_SESSION_ID', '').strip(),
    )

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

    # Authentication on the login endpoint happens inside the view, after the
    # request logging context was initialized as anonymous.
    set_authenticated_user_context(user.username)
    log_auth_success(username, user.id, ip_address, method='login')
    logger.info(
        '[login_success] user=%s user_id=%d ip=%s',
        username, user.id, ip_address,
    )

    return _set_auth_cookie(Response({
        'token': token.key,
        'user': _user_data(user),
    }), token)


# --- Profile ---

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_view(request):
    if request.method == 'GET':
        return Response(_user_data(request.user))

    # PUT - update profile
    data = request.data

    email = _normalize_email(data.get('email', ''))
    email_changed = bool(email and email != _normalize_email(request.user.email))
    if email_changed:
        try:
            validate_email(email)
        except ValidationError:
            return Response({'error': 'ایمیل معتبر نیست'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=email).exclude(id=request.user.id).exists():
            return Response({'error': 'این ایمیل قبلاً استفاده شده است'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.email = email
    first_name = data.get('first_name', '').strip()
    if first_name is not None:
        request.user.first_name = first_name

    last_name = data.get('last_name', '').strip()
    if last_name is not None:
        request.user.last_name = last_name

    profile = _get_or_create_profile(request.user)
    if email_changed:
        profile.email_verified = False
        profile.verification_code = ''
        profile.verification_type = ''
        profile.code_generated_at = None

    try:
        with transaction.atomic():
            request.user.save()
            profile.save()
    except IntegrityError:
        return Response({'error': 'این ایمیل قبلاً استفاده شده است'}, status=status.HTTP_400_BAD_REQUEST)

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
            # Validate real image bytes (not just client-supplied Content-Type).
            if avatar.size > settings.MAX_AVATAR_SIZE:
                return Response(
                    {'error': f'حجم تصویر نباید بیشتر از {settings.MAX_AVATAR_SIZE // (1024 * 1024)} مگابایت باشد.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Real image validation with Pillow (rejects spoofed Content-Type and SVG/scripts).
            try:
                from django.core.files.images import get_image_dimensions
                from PIL import Image
                try:
                    avatar.seek(0)
                except Exception:
                    pass
                dims = get_image_dimensions(avatar)
                if not dims or not dims[0] or not dims[1]:
                    raise ValueError('Invalid image dimensions')
                try:
                    avatar.seek(0)
                except Exception:
                    pass
                Image.open(avatar).verify()
                try:
                    avatar.seek(0)
                except Exception:
                    pass
            except Exception:
                return Response({'error': 'فایل تصویری نامعتبر است.'}, status=status.HTTP_400_BAD_REQUEST)
            if profile.avatar:
                profile.avatar.delete(save=False)
            profile.avatar = avatar

    if 'style_preferences' in data:
        prefs = data.get('style_preferences')
        if prefs is None:
            profile.style_preferences = []
        else:
            profile.style_preferences = [str(p).strip() for p in prefs if str(p).strip()]

    profile.save()

    return Response(_user_data(request.user))


# --- Verification ---

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([SendOtpThrottle])
def send_verification_view(request):

    verify_type = request.data.get('type', 'email')
    profile = _get_or_create_profile(request.user)
    ip_address = get_client_ip(request)

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
        try:
            deliver_phone_otp(profile.phone, code)
        except OTPDeliveryError as exc:
            profile.verification_code = ''
            profile.verification_type = ''
            profile.code_generated_at = None
            profile.save(update_fields=['verification_code', 'verification_type', 'code_generated_at'])
            log_otp_request(request.user.id, 'phone', ip_address, success=False)
            return Response({'error': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        log_otp_request(request.user.id, 'phone', ip_address, success=True)
        logger.info('[otp_sent] user=%s type=phone ip=%s', request.user.username, ip_address)
        response_data = {'message': 'کد تأیید ارسال شد'}
        if settings.DEBUG:
            response_data['code'] = code
        return Response(response_data)

    elif verify_type == 'email':
        if not request.user.email:
            return Response({'error': 'ایمیل وارد نشده است'}, status=status.HTTP_400_BAD_REQUEST)
        code = profile.generate_verification_code('email')
        try:
            queue_email(
                request.user.email,
                'کد تأیید ایمیل — فروشگاه مد',
                f'کد تأیید شما: {code}\n\nاین کد تا ۱۰ دقیقه معتبر است.',
                'email_verification',
            )
            log_otp_request(request.user.id, 'email', ip_address, success=True)
            logger.info(
                '[otp_sent] user=%s type=email ip=%s',
                request.user.username, ip_address,
            )
        except Exception as e:
            log_otp_request(request.user.id, 'email', ip_address, success=False)
            logger.exception(
                '[otp_send_failed] user=%s type=email ip=%s error=%s',
                request.user.username, ip_address, str(e),
            )
            return Response(
                {'error': 'صف ارسال ایمیل موقتاً در دسترس نیست.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
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
                             ip=get_client_ip(request), fail_count=fail_count)
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

    # The project has no separate account-verified flag: either successfully
    # verified contact channel is the registration-completion event. Existing
    # users who were already verified are intentionally never backfilled.
    was_verified = profile.phone_verified or profile.email_verified
    with transaction.atomic():
        if verify_type == 'phone':
            profile.phone_verified = True
        elif verify_type == 'email':
            profile.email_verified = True

        profile.verification_code = ''
        profile.verification_type = ''
        profile.save()

        if not was_verified:
            award_verified_registration_reward(
                user=request.user,
                verification_type=verify_type,
            )
            award_referral_registration_rewards(
                user=request.user,
                verification_type=verify_type,
            )

    if verify_type == 'email':
        _link_guest_orders_to_user(
            request.user, request.META.get('HTTP_X_SESSION_ID', '').strip(),
        )

    log_otp_verification(request.user.id, verify_type, success=True, ip=get_client_ip(request))
    logger.info(
        '[otp_verified] user=%s type=%s ip=%s',
        request.user.username, verify_type, get_client_ip(request),
    )

    return Response({'message': f'{"تلفن" if verify_type == "phone" else "ایمیل"} با موفقیت تأیید شد'})



# --- Password ---

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    old_password = request.data.get('old_password', '')
    new_password = request.data.get('new_password', '')
    ip_address = get_client_ip(request)

    if not old_password or not new_password:
        return Response({'error': 'رمز عبور فعلی و رمز عبور جدید الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

    if not request.user.check_password(old_password):
        log_auth_failure(request.user.username, ip_address, reason='wrong_password')
        return Response({'error': 'رمز عبور فعلی اشتباه است'}, status=status.HTTP_400_BAD_REQUEST)

    password_error = _validate_new_password(new_password, request.user)
    if password_error:
        return Response({'error': password_error}, status=status.HTTP_400_BAD_REQUEST)

    request.user.set_password(new_password)
    request.user.save()

    Token.objects.filter(user=request.user).delete()
    token = Token.objects.create(user=request.user)

    log_password_reset(request.user.id, ip_address, method='change')
    logger.info(
        '[password_changed] user=%s user_id=%d ip=%s',
        request.user.username, request.user.id, ip_address,
    )

    return _set_auth_cookie(
        Response({'message': 'رمز عبور با موفقیت تغییر کرد', 'token': token.key}), token,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    response = Response(status=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(settings.AUTH_TOKEN_COOKIE_NAME, path='/')
    return response


# --- Password Reset ---

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ForgotPasswordThrottle])
def password_reset_request_view(request):

    email = _normalize_email(request.data.get('email', ''))
    ip_address = get_client_ip(request)
    if not email:
        return Response({'error': 'ایمیل الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email__iexact=email).order_by('id').first()
    if user is None:
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
        queue_email(
            email,
            'بازیابی رمز عبور — فروشگاه مد',
            (
                f'سلام {user.get_full_name() or user.username},\n\n'
                f'برای بازیابی رمز عبور روی لینک زیر کلیک کنید:\n\n'
                f'{reset_link}\n\n'
                f'این لینک تا ۲۴ ساعت معتبر است.\n'
                f'اگر شما این درخواست را نداده‌اید، این ایمیل را نادیده بگیرید.'
            ),
            'password_reset',
        )
        log_password_reset(user.id, ip_address, method='request')
        logger.info(
            '[password_reset_requested] user=%s user_id=%d ip=%s',
            user.username, user.id, ip_address,
        )
    except Exception as e:
        logger.exception(
            '[password_reset_email_failed] user=%s ip=%s error=%s',
            user.username, ip_address, str(e),
        )
        return Response(
            {'error': 'صف ارسال ایمیل موقتاً در دسترس نیست.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
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
    ip_address = get_client_ip(request)

    if not token or not new_password:
        return Response({'error': 'توکن و رمز عبور جدید الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

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

    password_error = _validate_new_password(new_password, user)
    if password_error:
        return Response({'error': password_error}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        user.set_password(new_password)
        user.save(update_fields=['password'])
        profile.reset_token = ''
        profile.reset_token_created_at = None
        profile.save(update_fields=['reset_token', 'reset_token_created_at'])
        Token.objects.filter(user=user).delete()
        new_token = Token.objects.create(user=user)

    log_password_reset(user.id, ip_address, method='confirm')
    logger.info(
        '[password_reset_success] user=%s user_id=%d ip=%s',
        user.username, user.id, ip_address,
    )

    return _set_auth_cookie(Response({
        'message': 'رمز عبور با موفقیت بازیابی شد',
        'token': new_token.key,
        'user': _user_data(user),
    }), new_token)


# --- Login History ---

from .address_views import shipping_address_detail_view, shipping_address_list_view
from .history_views import login_history_view
