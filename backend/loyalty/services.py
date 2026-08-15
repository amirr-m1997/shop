import hashlib
import secrets
from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal
from typing import Optional

from django.db import IntegrityError, transaction
from django.db.models import F
from django.db.models import Q
from django.core.signing import BadSignature
from django.utils import timezone

from .models import (
    ReferralAttribution, LoyaltyAccount, LoyaltyEventType, LoyaltyRule,
    LoyaltyTransaction, PurchaseRewardTier, LoyaltyRedemptionRule, LoyaltyRedemption,
)


VERIFIED_REGISTRATION_EVENT_CODE = 'verified-registration'
REFERRAL_REGISTRATION_EVENT_CODE = 'referral-registration'
REFERRED_USER_REGISTRATION_EVENT_CODE = 'referred-user-registration'
PURCHASE_EVENT_CODE = 'purchase'
REFERRAL_PURCHASE_EVENT_CODE = 'referral-purchase'
REVIEW_SUBMISSION_EVENT_CODE = 'review-submission'
REDEMPTION_EVENT_CODE = 'redemption'
REFERRAL_COOKIE_NAME = 'product_referral'
REFERRAL_COOKIE_SALT = 'loyalty.product-referral.v1'
REFERRAL_TOKEN_TTL = timedelta(days=30)


class LoyaltyError(Exception):
    """Base exception for loyalty-domain failures."""


class InsufficientLoyaltyPoints(LoyaltyError):
    """Raised when a debit would make an account balance negative."""


class IdempotencyConflict(LoyaltyError):
    """Raised when an idempotency key is reused for a different operation."""


class ReferralError(LoyaltyError):
    """Raised when a referral token or attribution cannot qualify."""


class RedemptionError(LoyaltyError):
    """Raised when a loyalty reward cannot be redeemed or applied."""


@dataclass(frozen=True)
class LoyaltyOperationResult:
    transaction: Optional[LoyaltyTransaction]
    created: bool


def get_or_create_loyalty_account(user):
    """Return one account per user, handling a concurrent first creation."""
    try:
        return LoyaltyAccount.objects.get(user=user)
    except LoyaltyAccount.DoesNotExist:
        try:
            with transaction.atomic():
                return LoyaltyAccount.objects.create(user=user)
        except IntegrityError:
            return LoyaltyAccount.objects.get(user=user)


def get_active_rule(event_type_code, *, at=None):
    """Select the highest-priority currently effective rule for an event."""
    at = at or timezone.now()
    return LoyaltyRule.objects.select_related('event_type').filter(
        event_type__code=event_type_code,
        event_type__is_active=True,
        is_active=True,
    ).filter(
        Q(starts_at__isnull=True) | Q(starts_at__lte=at),
        Q(ends_at__isnull=True) | Q(ends_at__gte=at),
    ).order_by('-priority', 'id').first()


def get_purchase_reward_tier(rule, order_total, *, at=None):
    """Select one deterministic, active tier for an order-total snapshot."""
    at = at or timezone.now()
    if not rule.is_effective_at(at):
        return None
    return PurchaseRewardTier.objects.filter(
        rule=rule,
        is_active=True,
        minimum_order_total__lte=order_total,
    ).filter(
        Q(maximum_order_total__isnull=True) | Q(maximum_order_total__gte=order_total),
        Q(starts_at__isnull=True) | Q(starts_at__lte=at),
        Q(ends_at__isnull=True) | Q(ends_at__gte=at),
    ).order_by('-priority', 'id').first()


def _resolve_event_type(event_type):
    if isinstance(event_type, LoyaltyEventType):
        return event_type
    return LoyaltyEventType.objects.get(code=event_type)


def _assert_matching_idempotent_transaction(existing, *, user, points_delta, event_type):
    if (
        existing.user_id != user.id
        or existing.points_delta != points_delta
        or existing.event_type_id != event_type.id
    ):
        raise IdempotencyConflict('The idempotency key belongs to a different loyalty operation.')


def _account_counter_deltas(*, points_delta, entry_type, reversal_of):
    earned_delta = 0
    redeemed_delta = 0
    if entry_type == LoyaltyTransaction.ENTRY_REWARD and points_delta > 0:
        earned_delta = points_delta
    elif entry_type == LoyaltyTransaction.ENTRY_REDEMPTION and points_delta < 0:
        redeemed_delta = -points_delta
    elif entry_type == LoyaltyTransaction.ENTRY_ADJUSTMENT and points_delta > 0:
        earned_delta = points_delta
    elif entry_type == LoyaltyTransaction.ENTRY_REVERSAL and reversal_of:
        if reversal_of.entry_type in (LoyaltyTransaction.ENTRY_REWARD, LoyaltyTransaction.ENTRY_ADJUSTMENT):
            earned_delta = points_delta
        elif reversal_of.entry_type == LoyaltyTransaction.ENTRY_REDEMPTION:
            redeemed_delta = -points_delta
    return earned_delta, redeemed_delta


@transaction.atomic
def record_loyalty_transaction(
    *,
    user,
    event_type,
    points_delta,
    idempotency_key,
    entry_type=LoyaltyTransaction.ENTRY_REWARD,
    rule=None,
    purchase_tier=None,
    order=None,
    qualifying_order_amount=None,
    product=None,
    related_user=None,
    reversal_of=None,
    description='',
    metadata=None,
):
    """Atomically write one idempotent ledger entry and update its account."""
    if not idempotency_key:
        raise ValueError('An idempotency key is required.')
    if not points_delta:
        raise ValueError('A loyalty transaction must have a non-zero points delta.')

    event_type = _resolve_event_type(event_type)
    if not event_type.is_active:
        raise LoyaltyError('The loyalty event type is inactive.')

    account = get_or_create_loyalty_account(user)
    account = LoyaltyAccount.objects.select_for_update().get(pk=account.pk)

    existing = LoyaltyTransaction.objects.filter(idempotency_key=idempotency_key).first()
    if existing:
        _assert_matching_idempotent_transaction(
            existing,
            user=user,
            points_delta=points_delta,
            event_type=event_type,
        )
        return LoyaltyOperationResult(transaction=existing, created=False)

    available_points = account.available_points + points_delta
    if available_points < 0:
        raise InsufficientLoyaltyPoints('The loyalty account does not have enough available points.')

    earned_delta, redeemed_delta = _account_counter_deltas(
        points_delta=points_delta,
        entry_type=entry_type,
        reversal_of=reversal_of,
    )
    total_earned = account.total_earned + earned_delta
    total_redeemed = account.total_redeemed + redeemed_delta
    if total_earned < 0 or total_redeemed < 0:
        raise LoyaltyError('The compensating transaction would invalidate loyalty totals.')

    try:
        # A savepoint keeps this outer atomic block usable if another worker
        # inserted the same globally unique key after the initial lookup.
        with transaction.atomic():
            loyalty_transaction = LoyaltyTransaction.objects.create(
                account=account,
                user=user,
                event_type=event_type,
                rule=rule,
                purchase_tier=purchase_tier,
                entry_type=entry_type,
                points_delta=points_delta,
                idempotency_key=idempotency_key,
                order=order,
                qualifying_order_amount=qualifying_order_amount,
                product=product,
                related_user=related_user,
                reversal_of=reversal_of,
                description=description,
                metadata=metadata or {},
            )
    except IntegrityError:
        existing = LoyaltyTransaction.objects.get(idempotency_key=idempotency_key)
        _assert_matching_idempotent_transaction(
            existing,
            user=user,
            points_delta=points_delta,
            event_type=event_type,
        )
        return LoyaltyOperationResult(transaction=existing, created=False)
    account.available_points = available_points
    account.total_earned = total_earned
    account.total_redeemed = total_redeemed
    account.save(update_fields=['available_points', 'total_earned', 'total_redeemed', 'updated_at'])
    return LoyaltyOperationResult(transaction=loyalty_transaction, created=True)


def award_points_for_event(*, user, event_type_code, idempotency_key, at=None, **references):
    """Award points using the active rule; no reward is issued when none matches."""
    existing = LoyaltyTransaction.objects.select_related('event_type').filter(
        idempotency_key=idempotency_key,
    ).first()
    if existing:
        if existing.user_id != user.id or existing.event_type.code != event_type_code:
            raise IdempotencyConflict('The idempotency key belongs to a different loyalty operation.')
        return LoyaltyOperationResult(transaction=existing, created=False)
    rule = get_active_rule(event_type_code, at=at)
    if rule is None:
        return LoyaltyOperationResult(transaction=None, created=False)
    metadata = dict(references.pop('metadata', {}) or {})
    metadata.setdefault('rule_code', rule.code)
    return record_loyalty_transaction(
        user=user,
        event_type=rule.event_type,
        points_delta=rule.points,
        idempotency_key=idempotency_key,
        rule=rule,
        metadata=metadata,
        **references,
    )


def award_verified_registration_reward(*, user, verification_type, verified_at=None):
    """Issue the one configurable reward for a user's first completed OTP verification."""
    verified_at = verified_at or timezone.now()
    return award_points_for_event(
        user=user,
        event_type_code=VERIFIED_REGISTRATION_EVENT_CODE,
        idempotency_key=f'verified-registration:user:{user.pk}',
        at=verified_at,
        description='Verified registration reward',
        metadata={
            'verification_type': verification_type,
            'verified_at': verified_at.isoformat(),
            'source': 'accounts.verify_code_view',
        },
    )


def _token_hash(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def create_referral_attribution(*, referrer, product, originating_message=None, now=None):
    """Create an explicit share attribution and return it with its one-time raw token."""
    if not product.is_active:
        raise ReferralError('Only active products can be shared with a referral link.')
    if originating_message is not None:
        if originating_message.sender_id != referrer.id or originating_message.product_id != product.id:
            raise ReferralError('The message does not belong to this product share.')
    now = now or timezone.now()
    for _ in range(5):
        token = secrets.token_urlsafe(32)
        try:
            attribution = ReferralAttribution.objects.create(
                referrer=referrer, product=product, originating_message=originating_message,
                token_hash=_token_hash(token), expires_at=now + REFERRAL_TOKEN_TTL,
            )
            try:
                from personalization.services import record_product_share
                share_key = (
                    f'product-share:message:{originating_message.pk}'
                    if originating_message is not None
                    else f'product-share:referral:{attribution.pk}'
                )
                record_product_share(
                    user=referrer,
                    product=product,
                    source='referral',
                    idempotency_key=share_key,
                    metadata={'referral_id': str(attribution.pk)},
                )
            except Exception:
                import logging
                logging.getLogger('loyalty').exception(
                    '[personalization_product_share_error] referral_id=%s', attribution.pk,
                )
            return attribution, token
        except IntegrityError:
            continue
    raise ReferralError('Could not issue a secure referral token.')


def get_valid_referral_by_token(token, *, now=None):
    """Resolve a bearer token without exposing database identifiers."""
    if not token or len(token) > 255:
        return None
    attribution = ReferralAttribution.objects.select_related('product', 'referrer').filter(
        token_hash=_token_hash(token),
    ).first()
    now = now or timezone.now()
    if attribution is None or attribution.expires_at <= now or not attribution.product.is_active:
        if attribution and attribution.expires_at <= now and attribution.status in (
            ReferralAttribution.STATUS_CREATED, ReferralAttribution.STATUS_LANDED,
        ):
            ReferralAttribution.objects.filter(pk=attribution.pk).update(status=ReferralAttribution.STATUS_EXPIRED)
        return None
    if attribution.status not in (ReferralAttribution.STATUS_CREATED, ReferralAttribution.STATUS_LANDED):
        return None
    return attribution


def get_referral_cookie_id(request):
    try:
        return request.get_signed_cookie(REFERRAL_COOKIE_NAME, salt=REFERRAL_COOKIE_SALT)
    except (KeyError, ValueError, BadSignature):
        return None


def get_valid_referral_cookie(request):
    attribution_id = get_referral_cookie_id(request)
    if not attribution_id:
        return None
    try:
        attribution = ReferralAttribution.objects.select_related('product').get(pk=attribution_id)
    except (ReferralAttribution.DoesNotExist, ValueError):
        return None
    now = timezone.now()
    if (
        attribution.status not in (ReferralAttribution.STATUS_CREATED, ReferralAttribution.STATUS_LANDED)
        or attribution.expires_at <= now
        or not attribution.product.is_active
    ):
        return None
    return attribution


@transaction.atomic
def claim_referral_attribution_from_request(*, request, user, now=None):
    """Claim the first valid signed-browser attribution for a newly created user."""
    attribution_id = get_referral_cookie_id(request)
    if not attribution_id:
        return None
    try:
        attribution = ReferralAttribution.objects.select_for_update().select_related('product').get(pk=attribution_id)
    except (ReferralAttribution.DoesNotExist, ValueError):
        return None
    now = now or timezone.now()
    if (
        attribution.referrer_id == user.id
        or attribution.referred_user_id is not None
        or attribution.status not in (ReferralAttribution.STATUS_CREATED, ReferralAttribution.STATUS_LANDED)
        or attribution.expires_at <= now
        or not attribution.product.is_active
    ):
        return None
    attribution.referred_user = user
    attribution.claimed_at = now
    attribution.status = ReferralAttribution.STATUS_CLAIMED
    try:
        attribution.save(update_fields=['referred_user', 'claimed_at', 'status', 'updated_at'])
    except IntegrityError:
        return None
    return attribution


@transaction.atomic
def award_referral_registration_rewards(*, user, verification_type, verified_at=None):
    """Award each configurable referral registration event once after first OTP verification."""
    verified_at = verified_at or timezone.now()
    attribution = ReferralAttribution.objects.select_for_update().select_related('product', 'referrer').filter(
        referred_user=user,
        status=ReferralAttribution.STATUS_CLAIMED,
    ).first()
    if attribution is None or attribution.referrer_id == user.id:
        return None

    metadata = {
        'referral_attribution_id': str(attribution.id),
        'originating_message_id': attribution.originating_message_id,
        'verification_type': verification_type,
        'verified_at': verified_at.isoformat(),
        'source': 'accounts.verify_code_view',
    }
    award_points_for_event(
        user=attribution.referrer,
        event_type_code=REFERRAL_REGISTRATION_EVENT_CODE,
        idempotency_key=f'referral-registration:attribution:{attribution.id}:referrer',
        at=verified_at, product=attribution.product, related_user=user,
        description='Referral registration reward', metadata=metadata,
    )
    award_points_for_event(
        user=user,
        event_type_code=REFERRED_USER_REGISTRATION_EVENT_CODE,
        idempotency_key=f'referred-user-registration:attribution:{attribution.id}:referred',
        at=verified_at, product=attribution.product, related_user=attribution.referrer,
        description='Referred user registration reward', metadata=metadata,
    )
    attribution.status = ReferralAttribution.STATUS_VERIFIED
    attribution.verified_at = verified_at
    attribution.save(update_fields=['status', 'verified_at', 'updated_at'])
    return attribution


def reverse_loyalty_transaction(*, original_transaction, idempotency_key, description='', metadata=None):
    """Create a compensating ledger row instead of mutating historical data."""
    return record_loyalty_transaction(
        user=original_transaction.user,
        event_type=original_transaction.event_type,
        points_delta=-original_transaction.points_delta,
        idempotency_key=idempotency_key,
        entry_type=LoyaltyTransaction.ENTRY_REVERSAL,
        rule=original_transaction.rule,
        purchase_tier=original_transaction.purchase_tier,
        order=original_transaction.order,
        qualifying_order_amount=original_transaction.qualifying_order_amount,
        product=original_transaction.product,
        related_user=original_transaction.related_user,
        reversal_of=original_transaction,
        description=description or f'Reversal of loyalty transaction #{original_transaction.pk}',
        metadata=metadata or {'reversal_of_id': original_transaction.pk},
    )


@transaction.atomic
def redeem_loyalty_reward(*, user, rule_id, idempotency_key):
    """Deduct points and issue one auditable, redeemable reward atomically."""
    if not idempotency_key:
        raise RedemptionError('An idempotency key is required.')
    existing = LoyaltyRedemption.objects.select_related('rule', 'ledger_transaction').filter(
        user=user, idempotency_key=idempotency_key,
    ).first()
    if existing:
        return existing

    rule = LoyaltyRedemptionRule.objects.select_for_update().get(pk=rule_id)
    now = timezone.now()
    if not rule.is_effective_at(now):
        raise RedemptionError('This redemption reward is not currently available.')

    account = get_or_create_loyalty_account(user)
    account = LoyaltyAccount.objects.select_for_update().get(pk=account.pk)
    if account.available_points < rule.points_required:
        raise InsufficientLoyaltyPoints('The loyalty account does not have enough available points.')

    redemption = LoyaltyRedemption.objects.create(
        user=user,
        rule=rule,
        idempotency_key=idempotency_key,
        points_cost=rule.points_required,
        reward_type=rule.reward_type,
        discount_type=rule.discount_type,
        discount_value=rule.discount_value,
        minimum_order_value=rule.minimum_order_value,
        maximum_discount=rule.maximum_discount,
    )
    ledger = record_loyalty_transaction(
        user=user,
        event_type=REDEMPTION_EVENT_CODE,
        points_delta=-rule.points_required,
        idempotency_key=f'redemption:{redemption.pk}',
        entry_type=LoyaltyTransaction.ENTRY_REDEMPTION,
        rule=None,
        description=f'Redeemed reward: {rule.name}',
        metadata={
            'redemption_id': redemption.pk,
            'redemption_code': redemption.redemption_code,
            'rule_code': rule.code,
            'reward_type': rule.reward_type,
        },
    )
    redemption.ledger_transaction = ledger.transaction
    redemption.save(update_fields=['ledger_transaction', 'updated_at'])
    LoyaltyRedemptionRule.objects.filter(pk=rule.pk).update(used_count=rule.used_count + 1)
    return redemption


def redemption_discount_and_shipping(redemption, *, subtotal, shipping_cost):
    """Apply the immutable redemption snapshot using checkout's existing totals."""
    if redemption.minimum_order_value is not None and subtotal < redemption.minimum_order_value:
        raise RedemptionError('The order does not meet this reward minimum.')
    if redemption.reward_type == LoyaltyRedemptionRule.REWARD_FREE_SHIPPING:
        return Decimal('0'), Decimal('0')
    if redemption.discount_type == LoyaltyRedemptionRule.DISCOUNT_PERCENTAGE:
        discount = subtotal * redemption.discount_value / Decimal('100')
    else:
        discount = redemption.discount_value
    discount = min(discount, subtotal)
    if redemption.maximum_discount is not None:
        discount = min(discount, redemption.maximum_discount)
    return discount, shipping_cost


@transaction.atomic
def reserve_redemption_for_order(*, redemption_code, user, order, subtotal, shipping_cost):
    redemption = LoyaltyRedemption.objects.select_for_update().select_related('rule').filter(
        redemption_code=redemption_code, user=user,
    ).first()
    if redemption is None or redemption.status != LoyaltyRedemption.STATUS_AVAILABLE:
        raise RedemptionError('This reward is not available for checkout.')
    discount, final_shipping = redemption_discount_and_shipping(
        redemption, subtotal=subtotal, shipping_cost=shipping_cost,
    )
    redemption.status = LoyaltyRedemption.STATUS_RESERVED
    redemption.order = order
    redemption.reserved_at = timezone.now()
    redemption.save(update_fields=['status', 'order', 'reserved_at', 'updated_at'])
    return redemption, discount, final_shipping


@transaction.atomic
def consume_redemption_for_order(*, order):
    redemption = LoyaltyRedemption.objects.select_for_update().filter(order=order).first()
    if redemption is None:
        return None
    if redemption.status == LoyaltyRedemption.STATUS_CONSUMED:
        return redemption
    if redemption.status != LoyaltyRedemption.STATUS_RESERVED:
        raise RedemptionError('The order reward is not reserved.')
    redemption.status = LoyaltyRedemption.STATUS_CONSUMED
    redemption.consumed_at = timezone.now()
    redemption.save(update_fields=['status', 'consumed_at', 'updated_at'])
    return redemption


@transaction.atomic
def release_redemption_for_order(*, order):
    redemption = LoyaltyRedemption.objects.select_for_update().select_related('rule', 'ledger_transaction').filter(order=order).first()
    if redemption is None or redemption.status != LoyaltyRedemption.STATUS_RESERVED:
        return False
    if redemption.ledger_transaction_id:
        reverse_loyalty_transaction(
            original_transaction=redemption.ledger_transaction,
            idempotency_key=f'redemption-reversal:{redemption.pk}:order:{order.pk}',
            description='Restored loyalty redemption after checkout failure',
            metadata={'redemption_id': redemption.pk, 'order_id': order.pk},
        )
    redemption.status = LoyaltyRedemption.STATUS_AVAILABLE
    redemption.order = None
    redemption.released_at = timezone.now()
    redemption.save(update_fields=['status', 'order', 'released_at', 'updated_at'])
    LoyaltyRedemptionRule.objects.filter(pk=redemption.rule_id, used_count__gt=0).update(
        used_count=F('used_count') - 1,
    )
    return True


@transaction.atomic
def award_purchase_rewards_for_order(*, order, payment=None, at=None):
    """Award purchase and qualifying referral rewards after confirmed payment only."""
    from payments.models import Payment

    from orders.models import Order

    at = at or timezone.now()
    locked_order = Order.objects.select_for_update().get(pk=order.pk)
    if locked_order.payment_status != 'paid':
        return []
    if payment is None:
        payment = Payment.objects.select_for_update().get(order_id=locked_order.pk)
    else:
        payment = Payment.objects.select_for_update().get(pk=payment.pk)
    if payment.status != 'success' or payment.order_id != locked_order.pk:
        return []
    if locked_order.user_id is None:
        return []
    # A zero-value order is not a qualifying purchase for loyalty economics.
    if locked_order.total <= 0:
        return []

    results = []
    qualifying_amount = locked_order.total
    buyer_key = f'purchase:order:{locked_order.pk}:buyer:{locked_order.user_id}'
    existing_buyer = LoyaltyTransaction.objects.filter(idempotency_key=buyer_key).first()
    if existing_buyer:
        results.append(existing_buyer)
    else:
        purchase_rule = get_active_rule(PURCHASE_EVENT_CODE, at=at)
        purchase_tier = get_purchase_reward_tier(purchase_rule, qualifying_amount, at=at) if purchase_rule else None
        if purchase_rule and purchase_tier:
            buyer_result = record_loyalty_transaction(
                user=locked_order.user,
                event_type=purchase_rule.event_type,
                points_delta=purchase_tier.points,
                idempotency_key=buyer_key,
                rule=purchase_rule,
                purchase_tier=purchase_tier,
                order=locked_order,
                qualifying_order_amount=qualifying_amount,
                description='Purchase loyalty reward',
                metadata={
                    'source': 'payments.payment_verify_callback',
                    'order_total_snapshot': str(qualifying_amount),
                    'tier_id': purchase_tier.pk,
                    'tier_name': purchase_tier.name,
                    'tier_priority': purchase_tier.priority,
                },
            )
            results.append(buyer_result.transaction)

    attribution = ReferralAttribution.objects.select_for_update().filter(
        referred_user_id=locked_order.user_id,
        status=ReferralAttribution.STATUS_VERIFIED,
    ).first()
    if attribution and attribution.referrer_id != locked_order.user_id:
        referral_key = f'referral-purchase:attribution:{attribution.pk}:order:{locked_order.pk}'
        referral_result = award_points_for_event(
            user=attribution.referrer,
            event_type_code=REFERRAL_PURCHASE_EVENT_CODE,
            idempotency_key=referral_key,
            at=at,
            order=locked_order,
            product=attribution.product,
            related_user=locked_order.user,
            qualifying_order_amount=qualifying_amount,
            metadata={
                'source': 'payments.payment_verify_callback',
                'referral_attribution_id': str(attribution.pk),
                'referred_user_id': locked_order.user_id,
                'order_total_snapshot': str(qualifying_amount),
            },
        )
        if referral_result.transaction:
            results.append(referral_result.transaction)
        if referral_result.transaction and attribution.qualifying_order_id is None:
            attribution.qualifying_order = locked_order
            attribution.save(update_fields=['qualifying_order', 'updated_at'])
    return results
