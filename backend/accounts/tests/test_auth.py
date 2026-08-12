"""
Comprehensive test suite for accounts authentication views.

Covers registration, login, logout, profile, password management,
OTP verification, password reset, login history, and shipping addresses.
"""
import uuid
from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token

from accounts.models import UserProfile, LoginHistory
from accounts.security import (
    record_login_failure, clear_login_failures, is_account_locked,
    record_otp_send, record_otp_failure, clear_otp_failures, is_otp_locked,
)
from orders.models import ShippingAddress
from shop.tests import (
    UserFactory, UserProfileFactory, ShippingAddressFactory,
    create_user_with_token,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

REG_URL = '/api/auth/register/'
LOGIN_URL = '/api/auth/login/'
LOGOUT_URL = '/api/auth/logout/'
USER_URL = '/api/auth/user/'
CHANGE_PW_URL = '/api/auth/change-password/'
SEND_OTP_URL = '/api/auth/send-verification/'
VERIFY_CODE_URL = '/api/auth/verify-code/'
RESET_URL = '/api/auth/password-reset/'
RESET_CONFIRM_URL = '/api/auth/password-reset-confirm/'
HISTORY_URL = '/api/auth/login-history/'
ADDRESSES_URL = '/api/auth/addresses/'


def _addr_detail_url(pk):
    return f'/api/auth/addresses/{pk}/'


# ---------------------------------------------------------------------------
# 1. Registration
# ---------------------------------------------------------------------------

class RegistrationTests(APITestCase):
    """POST /api/auth/register/"""

    def setUp(self):
        cache.clear()

    def test_valid_registration_returns_token_and_user(self):
        data = {
            'username': 'newuser',
            'password': 'secure1234',
            'email': 'new@example.com',
            'first_name': 'Ali',
            'last_name': 'Rezaei',
            'phone': '09121234567',
        }
        resp = self.client.post(REG_URL, data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', resp.data)
        self.assertEqual(resp.data['user']['username'], 'newuser')
        self.assertEqual(resp.data['user']['email'], 'new@example.com')
        self.assertTrue(Token.objects.filter(user__username='newuser').exists())

    def test_registration_creates_profile(self):
        self.client.post(REG_URL, {
            'username': 'profileuser',
            'password': 'secure1234',
            'phone': '09120000000',
        }, format='json')
        user = User.objects.get(username='profileuser')
        self.assertTrue(hasattr(user, 'profile'))
        self.assertEqual(user.profile.phone, '09120000000')

    def test_registration_records_login_history(self):
        self.client.post(REG_URL, {
            'username': 'histuser',
            'password': 'secure1234',
        }, format='json')
        user = User.objects.get(username='histuser')
        self.assertEqual(LoginHistory.objects.filter(user=user).count(), 1)

    def test_duplicate_username_returns_400(self):
        UserFactory(username='taken')
        resp = self.client.post(REG_URL, {
            'username': 'taken',
            'password': 'secure1234',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_username_returns_400(self):
        resp = self.client.post(REG_URL, {'password': 'secure1234'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_password_returns_400(self):
        resp = self.client.post(REG_URL, {'username': 'nopwuser'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_body_returns_400(self):
        resp = self.client.post(REG_URL, {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# 2. Login
# ---------------------------------------------------------------------------

class LoginTests(APITestCase):
    """POST /api/auth/login/"""

    def setUp(self):
        cache.clear()
        self.user = UserFactory(username='loginuser')
        self.user.set_password('pass1234')
        self.user.save()
        UserProfileFactory(user=self.user)

    def test_valid_login_returns_token(self):
        resp = self.client.post(LOGIN_URL, {
            'username': 'loginuser',
            'password': 'pass1234',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('token', resp.data)
        self.assertEqual(resp.data['user']['username'], 'loginuser')

    def test_login_records_history(self):
        self.client.post(LOGIN_URL, {
            'username': 'loginuser',
            'password': 'pass1234',
        }, format='json')
        self.assertTrue(
            LoginHistory.objects.filter(user=self.user).exists()
        )

    def test_invalid_password_returns_400(self):
        resp = self.client.post(LOGIN_URL, {
            'username': 'loginuser',
            'password': 'wrongpass',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nonexistent_user_returns_400(self):
        resp = self.client.post(LOGIN_URL, {
            'username': 'nobody',
            'password': 'pass1234',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_username_returns_400(self):
        resp = self.client.post(LOGIN_URL, {'password': 'pass1234'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_locked_account_returns_423(self):
        identifier = 'lockeduser'
        for _ in range(10):
            record_login_failure(identifier)
        resp = self.client.post(LOGIN_URL, {
            'username': 'lockeduser',
            'password': 'pass1234',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_423_LOCKED)

    def test_locked_ip_returns_423(self):
        for _ in range(10):
            record_login_failure('127.0.0.1')
        resp = self.client.post(LOGIN_URL, {
            'username': 'anyuser',
            'password': 'pass1234',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_423_LOCKED)

    def test_successful_login_clears_failures(self):
        identifier = 'clearuser'
        record_login_failure(identifier)
        record_login_failure(identifier)
        self.assertEqual(cache.get(f'login_fails:{identifier}', 0), 2)

        UserFactory(username='clearuser')
        self.client.post(LOGIN_URL, {
            'username': 'clearuser',
            'password': 'testpass123',
        }, format='json')
        self.assertEqual(cache.get(f'login_fails:{identifier}', 0), 0)


# ---------------------------------------------------------------------------
# 3. Login security: progressive delay, CAPTCHA
# ---------------------------------------------------------------------------

class LoginSecurityTests(APITestCase):
    """Progressive delay and CAPTCHA enforcement after failures."""

    def setUp(self):
        cache.clear()
        self.identifier = 'secuser'

    def _record_failures(self, count):
        for _ in range(count):
            record_login_failure(self.identifier)

    @patch('accounts.security.time.sleep')
    def test_progressive_delay_applied_at_4_failures(self, mock_sleep):
        self._record_failures(4)
        self.client.post(LOGIN_URL, {
            'username': 'secuser',
            'password': 'wrong',
        }, format='json')
        mock_sleep.assert_called_with(2)

    @patch('accounts.security.time.sleep')
    @override_settings(DEBUG=True)
    def test_progressive_delay_applied_at_7_failures(self, mock_sleep):
        self._record_failures(7)
        self.client.post(LOGIN_URL, {
            'username': 'secuser',
            'password': 'wrong',
        }, format='json')
        mock_sleep.assert_called_with(5)

    @patch('accounts.security.time.sleep')
    def test_no_delay_below_4_failures(self, mock_sleep):
        self._record_failures(3)
        self.client.post(LOGIN_URL, {
            'username': 'secuser',
            'password': 'wrong',
        }, format='json')
        mock_sleep.assert_not_called()

    def test_captcha_required_after_5_failures(self):
        self._record_failures(5)
        resp = self.client.post(LOGIN_URL, {
            'username': 'secuser',
            'password': 'wrong',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(resp.data.get('captcha_required'))

    @override_settings(DEBUG=True)
    def test_captcha_bypassed_in_debug_mode(self):
        self._record_failures(5)
        resp = self.client.post(LOGIN_URL, {
            'username': 'secuser',
            'password': 'wrong',
            'captcha': '',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('نام کاربری یا رمز عبور اشتباه است', resp.data['error'])


# ---------------------------------------------------------------------------
# 4. Logout
# ---------------------------------------------------------------------------

class LogoutTests(APITestCase):
    """POST /api/auth/logout/"""

    def setUp(self):
        self.user, self.token = create_user_with_token(username='logoutuser')

    def test_valid_logout_deletes_token(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        resp = self.client.post(LOGOUT_URL)
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Token.objects.filter(user=self.user).exists())

    def test_unauthenticated_logout_returns_401(self):
        resp = self.client.post(LOGOUT_URL)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_without_token_returns_401(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token invalidtoken')
        resp = self.client.post(LOGOUT_URL)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# 5. Profile
# ---------------------------------------------------------------------------

class ProfileTests(APITestCase):
    """GET/PUT /api/auth/user/"""

    def setUp(self):
        cache.clear()
        self.user, self.token = create_user_with_token(
            username='profuser',
            email='prof@example.com',
        )
        self.profile = UserProfileFactory(user=self.user, phone='09121234567')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    def test_get_profile(self):
        resp = self.client.get(USER_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['username'], 'profuser')
        self.assertEqual(resp.data['email'], 'prof@example.com')

    def test_update_profile(self):
        resp = self.client.put(USER_URL, {
            'first_name': 'NewFirst',
            'last_name': 'NewLast',
            'email': 'new@example.com',
            'phone': '09990000000',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'NewFirst')
        self.assertEqual(self.user.email, 'new@example.com')

    def test_update_duplicate_email_returns_400(self):
        UserFactory(username='other', email='taken@example.com')
        resp = self.client.put(USER_URL, {
            'email': 'taken@example.com',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_get_returns_401(self):
        self.client.credentials()
        resp = self.client.get(USER_URL)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_put_returns_401(self):
        self.client.credentials()
        resp = self.client.put(USER_URL, {'first_name': 'X'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_phone_resets_verification(self):
        self.profile.phone_verified = True
        self.profile.save()
        resp = self.client.put(USER_URL, {
            'phone': '09111111111',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.profile.refresh_from_db()
        self.assertFalse(self.profile.phone_verified)

    def test_update_same_phone_keeps_verified(self):
        self.profile.phone = '09111111111'
        self.profile.phone_verified = True
        self.profile.save()
        resp = self.client.put(USER_URL, {
            'phone': '09111111111',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.phone_verified)


# ---------------------------------------------------------------------------
# 6. Password Change
# ---------------------------------------------------------------------------

class ChangePasswordTests(APITestCase):
    """POST /api/auth/change-password/"""

    def setUp(self):
        self.user, self.token = create_user_with_token(username='chpwuser')
        self.user.set_password('oldpass123')
        self.user.save()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    def test_valid_password_change(self):
        resp = self.client.post(CHANGE_PW_URL, {
            'old_password': 'oldpass123',
            'new_password': 'newpass456',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('token', resp.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('newpass456'))

    def test_password_change_invalidates_old_token(self):
        old_token = self.token
        resp = self.client.post(CHANGE_PW_URL, {
            'old_password': 'oldpass123',
            'new_password': 'newpass456',
        }, format='json')
        self.assertFalse(Token.objects.filter(key=old_token).exists())

    def test_password_change_returns_new_token(self):
        resp = self.client.post(CHANGE_PW_URL, {
            'old_password': 'oldpass123',
            'new_password': 'newpass456',
        }, format='json')
        new_token = resp.data['token']
        self.assertNotEqual(new_token, self.token)

    def test_wrong_old_password_returns_400(self):
        resp = self.client.post(CHANGE_PW_URL, {
            'old_password': 'wrongold',
            'new_password': 'newpass456',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_short_new_password_returns_400(self):
        resp = self.client.post(CHANGE_PW_URL, {
            'old_password': 'oldpass123',
            'new_password': '123',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_fields_returns_400(self):
        resp = self.client.post(CHANGE_PW_URL, {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_returns_401(self):
        self.client.credentials()
        resp = self.client.post(CHANGE_PW_URL, {
            'old_password': 'oldpass123',
            'new_password': 'newpass456',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# 7. OTP: send & verify
# ---------------------------------------------------------------------------

class SendVerificationTests(APITestCase):
    """POST /api/auth/send-verification/"""

    def setUp(self):
        cache.clear()
        self.user, self.token = create_user_with_token(username='otpuser')
        self.user.email = 'otp@example.com'
        self.user.save()
        self.profile = UserProfileFactory(
            user=self.user,
            phone='09121234567',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    @patch('accounts.views.send_mail')
    def test_send_email_otp(self, mock_send):
        mock_send.return_value = True
        resp = self.client.post(SEND_OTP_URL, {'type': 'email'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        mock_send.assert_called_once()

    @override_settings(DEBUG=True)
    def test_phone_otp_code_included_in_debug(self):
        resp = self.client.post(SEND_OTP_URL, {'type': 'phone'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('code', resp.data)

    def test_send_phone_otp(self):
        resp = self.client.post(SEND_OTP_URL, {'type': 'phone'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_send_phone_otp_no_phone_returns_400(self):
        self.profile.phone = ''
        self.profile.save()
        resp = self.client.post(SEND_OTP_URL, {'type': 'phone'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_send_email_otp_no_email_returns_400(self):
        self.user.email = ''
        self.user.save()
        resp = self.client.post(SEND_OTP_URL, {'type': 'email'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_type_returns_400(self):
        resp = self.client.post(SEND_OTP_URL, {'type': 'fax'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('accounts.views.send_mail')
    def test_otp_lockout_after_5_failures(self, mock_send):
        mock_send.return_value = True
        lock_id = f'{self.user.id}:email'
        for _ in range(5):
            record_otp_failure(lock_id)
        resp = self.client.post(SEND_OTP_URL, {'type': 'email'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_423_LOCKED)

    def test_send_otp_records_send_count(self):
        lock_id = f'{self.user.id}:email'
        count = record_otp_send(lock_id)
        self.assertEqual(count, 1)

    def test_unauthenticated_returns_401(self):
        self.client.credentials()
        resp = self.client.post(SEND_OTP_URL, {'type': 'email'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class VerifyCodeTests(APITestCase):
    """POST /api/auth/verify-code/"""

    def setUp(self):
        cache.clear()
        self.user, self.token = create_user_with_token(username='verifyuser')
        self.user.email = 'verify@example.com'
        self.user.save()
        self.profile = UserProfileFactory(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    def _set_code(self, code, verify_type='email', generated_at=None):
        self.profile.refresh_from_db()
        self.profile.verification_code = code
        self.profile.verification_type = verify_type
        self.profile.code_generated_at = generated_at or timezone.now()
        self.profile.save()

    def test_verify_valid_email_code(self):
        self._set_code('123456', 'email')
        resp = self.client.post(VERIFY_CODE_URL, {
            'code': '123456',
            'type': 'email',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.email_verified)

    def test_verify_valid_phone_code(self):
        self._set_code('654321', 'phone')
        resp = self.client.post(VERIFY_CODE_URL, {
            'code': '654321',
            'type': 'phone',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.phone_verified)

    def test_verify_invalid_code_returns_400(self):
        self._set_code('123456', 'email')
        resp = self.client.post(VERIFY_CODE_URL, {
            'code': '000000',
            'type': 'email',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_expired_code_returns_400(self):
        # Code generated 11 minutes ago is beyond the 10-minute TTL.
        self._set_code('123456', 'email',
                       generated_at=timezone.now() - timedelta(minutes=11))
        resp = self.client.post(VERIFY_CODE_URL, {
            'code': '123456',
            'type': 'email',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('منقضی', resp.data.get('error', ''))
        self.profile.refresh_from_db()
        self.assertFalse(self.profile.email_verified)

    def test_verify_wrong_type_returns_400(self):
        self._set_code('123456', 'email')
        resp = self.client.post(VERIFY_CODE_URL, {
            'code': '123456',
            'type': 'phone',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_empty_code_returns_400(self):
        resp = self.client.post(VERIFY_CODE_URL, {
            'code': '',
            'type': 'email',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_clears_code_on_success(self):
        self._set_code('123456', 'email')
        self.client.post(VERIFY_CODE_URL, {
            'code': '123456',
            'type': 'email',
        }, format='json')
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.verification_code, '')

    def test_verify_lockout_after_5_failures(self):
        lock_id = f'{self.user.id}:email'
        for _ in range(5):
            record_otp_failure(lock_id)
        resp = self.client.post(VERIFY_CODE_URL, {
            'code': '000000',
            'type': 'email',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_423_LOCKED)

    def test_verify_failure_increments_otp_fail_count(self):
        lock_id = f'{self.user.id}:email'
        self._set_code('123456', 'email')
        self.client.post(VERIFY_CODE_URL, {
            'code': '000000',
            'type': 'email',
        }, format='json')
        self.assertEqual(cache.get(f'otp_fails:{lock_id}', 0), 1)

    def test_successful_verify_clears_otp_failures(self):
        lock_id = f'{self.user.id}:email'
        record_otp_failure(lock_id)
        self._set_code('123456', 'email')
        self.client.post(VERIFY_CODE_URL, {
            'code': '123456',
            'type': 'email',
        }, format='json')
        self.assertEqual(cache.get(f'otp_fails:{lock_id}', 0), 0)

    def test_unauthenticated_returns_401(self):
        self.client.credentials()
        resp = self.client.post(VERIFY_CODE_URL, {
            'code': '123456',
            'type': 'email',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# 8. Password Reset
# ---------------------------------------------------------------------------

class PasswordResetTests(APITestCase):
    """POST /api/auth/password-reset/ and /password-reset-confirm/"""

    def setUp(self):
        cache.clear()
        self.user = UserFactory(username='resetuser', email='reset@example.com')
        self.profile = UserProfileFactory(user=self.user)

    def _set_token(self, token, created_at=None):
        self.profile.refresh_from_db()
        self.profile.reset_token = token
        self.profile.reset_token_created_at = created_at or timezone.now()
        self.profile.save(update_fields=['reset_token', 'reset_token_created_at'])

    @patch('accounts.views.send_mail')
    def test_password_reset_request_sends_email(self, mock_send):
        mock_send.return_value = True
        resp = self.client.post(RESET_URL, {
            'email': 'reset@example.com',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        mock_send.assert_called_once()

    def test_password_reset_request_nonexistent_email_still_returns_200(self):
        resp = self.client.post(RESET_URL, {
            'email': 'nobody@example.com',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_password_reset_request_missing_email_returns_400(self):
        resp = self.client.post(RESET_URL, {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('accounts.views.send_mail')
    def test_password_reset_request_stores_token(self, mock_send):
        mock_send.return_value = True
        self.client.post(RESET_URL, {
            'email': 'reset@example.com',
        }, format='json')
        self.profile.refresh_from_db()
        self.assertTrue(len(self.profile.reset_token) > 0)

    def test_password_reset_confirm_valid_token(self):
        token = uuid.uuid4().hex[:40]
        self._set_token(token)
        resp = self.client.post(RESET_CONFIRM_URL, {
            'token': token,
            'new_password': 'newsecure123',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('token', resp.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('newsecure123'))

    def test_password_reset_confirm_expired_token_returns_400(self):
        token = uuid.uuid4().hex[:40]
        self._set_token(token, created_at=timezone.now() - timedelta(hours=25))
        resp = self.client.post(RESET_CONFIRM_URL, {
            'token': token,
            'new_password': 'newsecure123',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.reset_token, '')

    def test_password_reset_confirm_invalid_token_returns_400(self):
        resp = self.client.post(RESET_CONFIRM_URL, {
            'token': 'invalidtoken123',
            'new_password': 'newsecure123',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_reset_confirm_short_password_returns_400(self):
        token = uuid.uuid4().hex[:40]
        self._set_token(token)
        resp = self.client.post(RESET_CONFIRM_URL, {
            'token': token,
            'new_password': '123',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_reset_confirm_clears_token(self):
        token = uuid.uuid4().hex[:40]
        self._set_token(token)
        self.client.post(RESET_CONFIRM_URL, {
            'token': token,
            'new_password': 'newsecure123',
        }, format='json')
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.reset_token, '')

    def test_password_reset_confirm_creates_new_token(self):
        token = uuid.uuid4().hex[:40]
        self._set_token(token)
        resp = self.client.post(RESET_CONFIRM_URL, {
            'token': token,
            'new_password': 'newsecure123',
        }, format='json')
        self.assertIn('token', resp.data)
        new_token = resp.data['token']
        self.assertTrue(Token.objects.filter(key=new_token).exists())

    def test_password_reset_confirm_missing_fields_returns_400(self):
        resp = self.client.post(RESET_CONFIRM_URL, {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# 9. Login History
# ---------------------------------------------------------------------------

class LoginHistoryTests(APITestCase):
    """GET /api/auth/login-history/"""

    def setUp(self):
        cache.clear()
        self.user, self.token = create_user_with_token(username='histuser')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    def test_get_empty_history(self):
        resp = self.client.get(HISTORY_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])

    def test_get_history_after_login(self):
        self.client.post(LOGIN_URL, {
            'username': 'histuser',
            'password': 'testpass123',
        }, format='json')
        resp = self.client.get(HISTORY_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(resp.data), 1)
        self.assertIn('ip_address', resp.data[0])
        self.assertIn('user_agent', resp.data[0])
        self.assertIn('login_time', resp.data[0])

    def test_history_returns_limited_to_50(self):
        for _ in range(55):
            LoginHistory.objects.create(
                user=self.user,
                ip_address='1.2.3.4',
                user_agent='test',
            )
        resp = self.client.get(HISTORY_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 50)

    def test_unauthenticated_returns_401(self):
        self.client.credentials()
        resp = self.client.get(HISTORY_URL)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# 10. Shipping Addresses
# ---------------------------------------------------------------------------

class ShippingAddressListTests(APITestCase):
    """GET/POST /api/auth/addresses/"""

    def setUp(self):
        self.user, self.token = create_user_with_token(username='addruser')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    def test_get_empty_addresses(self):
        resp = self.client.get(ADDRESSES_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])

    def test_create_address(self):
        data = {
            'full_name': 'Test User',
            'phone': '09121234567',
            'address_line1': '123 Main St',
            'city': 'Tehran',
            'state': 'Tehran',
            'postal_code': '1234567890',
            'country': 'Iran',
            'is_default': True,
        }
        resp = self.client.post(ADDRESSES_URL, data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['full_name'], 'Test User')
        self.assertEqual(resp.data['city'], 'Tehran')

    def test_create_default_address_unsets_others(self):
        old_addr = ShippingAddressFactory(
            user=self.user,
            is_default=True,
        )
        self.client.post(ADDRESSES_URL, {
            'full_name': 'New',
            'phone': '09120000000',
            'address_line1': '456 New St',
            'city': 'Isfahan',
            'state': 'Isfahan',
            'postal_code': '0000000000',
            'is_default': True,
        }, format='json')
        old_addr.refresh_from_db()
        self.assertFalse(old_addr.is_default)

    def test_create_address_missing_required_returns_400(self):
        resp = self.client.post(ADDRESSES_URL, {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_only_own_addresses(self):
        other_user, _ = create_user_with_token(username='otheraddr')
        ShippingAddressFactory(user=other_user)
        my_addr = ShippingAddressFactory(user=self.user)
        resp = self.client.get(ADDRESSES_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['id'], my_addr.id)

    def test_unauthenticated_returns_401(self):
        self.client.credentials()
        resp = self.client.get(ADDRESSES_URL)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class ShippingAddressDetailTests(APITestCase):
    """GET/PUT/DELETE /api/auth/addresses/<pk>/"""

    def setUp(self):
        self.user, self.token = create_user_with_token(username='detailuser')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.addr = ShippingAddressFactory(user=self.user)

    def test_get_address_detail(self):
        resp = self.client.get(_addr_detail_url(self.addr.id))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['id'], self.addr.id)

    def test_get_other_user_address_returns_404(self):
        other_user, _ = create_user_with_token(username='otherdetail')
        other_addr = ShippingAddressFactory(user=other_user)
        resp = self.client.get(_addr_detail_url(other_addr.id))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_address(self):
        resp = self.client.put(_addr_detail_url(self.addr.id), {
            'full_name': 'Updated Name',
            'phone': '09129999999',
            'address_line1': 'Updated Address',
            'city': 'Shiraz',
            'state': 'Fars',
            'postal_code': '9999999999',
            'is_default': True,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.addr.refresh_from_db()
        self.assertEqual(self.addr.full_name, 'Updated Name')
        self.assertEqual(self.addr.city, 'Shiraz')

    def test_delete_address(self):
        resp = self.client.delete(_addr_detail_url(self.addr.id))
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ShippingAddress.objects.filter(id=self.addr.id).exists())

    def test_delete_nonexistent_address_returns_404(self):
        resp = self.client.delete(_addr_detail_url(99999))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_sets_default_unsets_others(self):
        old_addr = ShippingAddressFactory(user=self.user, is_default=True)
        resp = self.client.put(_addr_detail_url(self.addr.id), {
            'full_name': self.addr.full_name,
            'phone': self.addr.phone,
            'address_line1': self.addr.address_line1,
            'city': self.addr.city,
            'state': self.addr.state,
            'postal_code': self.addr.postal_code,
            'is_default': True,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        old_addr.refresh_from_db()
        self.assertFalse(old_addr.is_default)

    def test_unauthenticated_returns_401(self):
        self.client.credentials()
        resp = self.client.get(_addr_detail_url(self.addr.id))
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# 11. Account lockout / unlock
# ---------------------------------------------------------------------------

class AccountLockoutTests(APITestCase):
    """Lockout mechanics and recovery."""

    def setUp(self):
        cache.clear()

    def test_lockout_after_10_failures(self):
        for i in range(9):
            record_login_failure('locktest')
            self.assertFalse(is_account_locked('locktest'))
        record_login_failure('locktest')
        self.assertTrue(is_account_locked('locktest'))

    def test_lockout_expires(self):
        for _ in range(10):
            record_login_failure('expiretest')
        self.assertTrue(is_account_locked('expiretest'))
        cache.delete('login_lock:expiretest')
        self.assertFalse(is_account_locked('expiretest'))

    def test_clear_failures_unlocks(self):
        for _ in range(10):
            record_login_failure('cleartest')
        self.assertTrue(is_account_locked('cleartest'))
        clear_login_failures('cleartest')
        self.assertFalse(is_account_locked('cleartest'))


# ---------------------------------------------------------------------------
# 12. OTP lockout / unlock
# ---------------------------------------------------------------------------

class OtpLockoutTests(APITestCase):
    """OTP abuse lockout mechanics."""

    def setUp(self):
        cache.clear()

    def test_otp_lockout_after_5_failures(self):
        for i in range(4):
            record_otp_failure('otp_lock_test')
            self.assertFalse(is_otp_locked('otp_lock_test'))
        record_otp_failure('otp_lock_test')
        self.assertTrue(is_otp_locked('otp_lock_test'))

    def test_otp_clear_failures_unlocks(self):
        for _ in range(5):
            record_otp_failure('otp_clear_test')
        clear_otp_failures('otp_clear_test')
        self.assertFalse(is_otp_locked('otp_clear_test'))

    def test_otp_send_count_tracking(self):
        self.assertEqual(record_otp_send('otp_send_test'), 1)
        self.assertEqual(record_otp_send('otp_send_test'), 2)
        self.assertEqual(record_otp_send('otp_send_test'), 3)


# ---------------------------------------------------------------------------
# 13. Edge cases & integration
# ---------------------------------------------------------------------------

class EdgeCaseTests(APITestCase):
    """Cross-cutting edge-case scenarios."""

    def setUp(self):
        cache.clear()

    def test_register_and_login_flow(self):
        reg_resp = self.client.post(REG_URL, {
            'username': 'flowuser',
            'password': 'flowpass123',
        }, format='json')
        self.assertEqual(reg_resp.status_code, status.HTTP_201_CREATED)

        login_resp = self.client.post(LOGIN_URL, {
            'username': 'flowuser',
            'password': 'flowpass123',
        }, format='json')
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertIn('token', login_resp.data)

    def test_change_password_then_login_with_old_fails(self):
        user, token = create_user_with_token(username='chpwall')
        user.set_password('oldpass')
        user.save()

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        self.client.post(CHANGE_PW_URL, {
            'old_password': 'oldpass',
            'new_password': 'newpass123',
        }, format='json')

        self.client.credentials()
        resp = self.client.post(LOGIN_URL, {
            'username': 'chpwall',
            'password': 'oldpass',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_history_created_on_success(self):
        user = UserFactory(username='histcreate')
        user.set_password('pass1234')
        user.save()
        UserProfileFactory(user=user)
        self.client.post(LOGIN_URL, {
            'username': 'histcreate',
            'password': 'pass1234',
        }, format='json')
        self.assertTrue(LoginHistory.objects.filter(user=user).exists())

    def test_address_update_only_own(self):
        user1, _ = create_user_with_token(username='own1')
        user2, _ = create_user_with_token(username='own2')
        addr1 = ShippingAddressFactory(user=user1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {_}')
        resp = self.client.put(_addr_detail_url(addr1.id), {
            'full_name': 'Hacked',
            'phone': '09120000000',
            'address_line1': 'Hack',
            'city': 'X',
            'state': 'X',
            'postal_code': '0',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# 14. Security utilities (unit)
# ---------------------------------------------------------------------------

class SecurityUtilsTests(TestCase):
    """Direct unit tests for security module functions."""

    def setUp(self):
        cache.clear()

    def test_get_login_failure_count_default_zero(self):
        from accounts.security import get_login_failure_count
        self.assertEqual(get_login_failure_count('new_id'), 0)

    def test_record_login_failure_increments(self):
        from accounts.security import record_login_failure
        self.assertEqual(record_login_failure('fail_test'), 1)
        self.assertEqual(record_login_failure('fail_test'), 2)

    def test_is_account_locked_default_false(self):
        self.assertFalse(is_account_locked('any_id'))

    def test_otp_locked_default_false(self):
        self.assertFalse(is_otp_locked('any_id'))

    def test_otp_failure_at_threshold_locks(self):
        from accounts.security import OTP_FAIL_LOCKOUT_THRESHOLD
        for _ in range(OTP_FAIL_LOCKOUT_THRESHOLD):
            record_otp_failure('otp_thresh')
        self.assertTrue(is_otp_locked('otp_thresh'))

    def test_login_failure_at_threshold_locks(self):
        from accounts.security import LOGIN_FAIL_LOCKOUT_THRESHOLD
        for _ in range(LOGIN_FAIL_LOCKOUT_THRESHOLD):
            record_login_failure('login_thresh')
        self.assertTrue(is_account_locked('login_thresh'))

    def test_clear_login_failures_resets_count(self):
        record_login_failure('clear_unit')
        record_login_failure('clear_unit')
        clear_login_failures('clear_unit')
        from accounts.security import get_login_failure_count
        self.assertEqual(get_login_failure_count('clear_unit'), 0)

    def test_clear_otp_failures_resets(self):
        record_otp_failure('otp_clear')
        clear_otp_failures('otp_clear')
        from accounts.security import get_login_failure_count
        self.assertFalse(is_otp_locked('otp_clear'))
