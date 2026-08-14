import uuid
import secrets

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


def generate_redemption_code():
    return secrets.token_urlsafe(24)


class LoyaltyEventType(models.Model):
    """An administratively managed, stable business event identifier."""

    code = models.SlugField(max_length=64, unique=True)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name', 'id']
        verbose_name = 'Loyalty event type'
        verbose_name_plural = 'Loyalty event types'

    def __str__(self):
        return f'{self.name} ({self.code})'


class LoyaltyRule(models.Model):
    """A data-driven points rule for a single loyalty event type."""

    code = models.SlugField(max_length=96, unique=True)
    event_type = models.ForeignKey(
        LoyaltyEventType,
        on_delete=models.PROTECT,
        related_name='rules',
    )
    name = models.CharField(max_length=160)
    points = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    priority = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-priority', 'id']
        constraints = [
            models.CheckConstraint(
                check=Q(ends_at__isnull=True) | Q(starts_at__isnull=True) | Q(ends_at__gte=models.F('starts_at')),
                name='loyalty_rule_valid_dates',
            ),
        ]
        verbose_name = 'Loyalty rule'
        verbose_name_plural = 'Loyalty rules'

    def __str__(self):
        return self.name

    def is_effective_at(self, at=None):
        at = at or timezone.now()
        return (
            self.is_active
            and self.event_type.is_active
            and (self.starts_at is None or self.starts_at <= at)
            and (self.ends_at is None or self.ends_at >= at)
        )


class LoyaltyRedemptionRule(models.Model):
    REWARD_DISCOUNT = 'discount'
    REWARD_FREE_SHIPPING = 'free_shipping'
    REWARD_TYPE_CHOICES = [
        (REWARD_DISCOUNT, 'Discount'),
        (REWARD_FREE_SHIPPING, 'Free shipping'),
    ]
    DISCOUNT_PERCENTAGE = 'percentage'
    DISCOUNT_FIXED = 'fixed'
    DISCOUNT_TYPE_CHOICES = [
        (DISCOUNT_PERCENTAGE, 'Percentage'),
        (DISCOUNT_FIXED, 'Fixed amount'),
    ]

    code = models.SlugField(max_length=96, unique=True)
    name = models.CharField(max_length=160)
    reward_type = models.CharField(max_length=20, choices=REWARD_TYPE_CHOICES)
    points_required = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES, null=True, blank=True)
    discount_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    minimum_order_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    maximum_discount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    used_count = models.PositiveIntegerField(default=0)
    priority = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-priority', 'id']
        constraints = [
            models.CheckConstraint(
                check=Q(ends_at__isnull=True) | Q(starts_at__isnull=True) | Q(ends_at__gte=models.F('starts_at')),
                name='loyalty_redeem_rule_valid_dates',
            ),
            models.CheckConstraint(check=Q(used_count__gte=0), name='loyalty_redeem_rule_used_nonnegative'),
        ]

    def is_effective_at(self, at=None):
        at = at or timezone.now()
        return (
            self.is_active
            and (self.starts_at is None or self.starts_at <= at)
            and (self.ends_at is None or self.ends_at >= at)
            and (self.usage_limit is None or self.used_count < self.usage_limit)
        )

    def __str__(self):
        return self.name


class PurchaseRewardTier(models.Model):
    """A configurable order-total range belonging to a loyalty rule."""

    rule = models.ForeignKey(
        LoyaltyRule,
        on_delete=models.CASCADE,
        related_name='purchase_tiers',
    )
    name = models.CharField(max_length=160)
    minimum_order_total = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    maximum_order_total = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    points = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    priority = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-priority', 'minimum_order_total', 'id']
        constraints = [
            models.CheckConstraint(
                check=Q(maximum_order_total__isnull=True) | Q(maximum_order_total__gte=models.F('minimum_order_total')),
                name='loyalty_tier_valid_total_range',
            ),
            models.CheckConstraint(
                check=Q(ends_at__isnull=True) | Q(starts_at__isnull=True) | Q(ends_at__gte=models.F('starts_at')),
                name='loyalty_tier_valid_dates',
            ),
            models.UniqueConstraint(fields=['rule', 'priority'], name='loyalty_tier_rule_priority_unique'),
        ]
        verbose_name = 'Purchase reward tier'
        verbose_name_plural = 'Purchase reward tiers'

    def __str__(self):
        return self.name

    def is_effective_at(self, at=None):
        at = at or timezone.now()
        return (
            self.is_active
            and self.rule.is_effective_at(at)
            and (self.starts_at is None or self.starts_at <= at)
            and (self.ends_at is None or self.ends_at >= at)
        )


class LoyaltyAccount(models.Model):
    """A locked, cached balance backed by the immutable transaction ledger."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='loyalty_account',
    )
    available_points = models.PositiveIntegerField(default=0)
    total_earned = models.PositiveIntegerField(default=0)
    total_redeemed = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(check=Q(available_points__gte=0), name='loyalty_account_available_nonnegative'),
            models.CheckConstraint(check=Q(total_earned__gte=0), name='loyalty_account_earned_nonnegative'),
            models.CheckConstraint(check=Q(total_redeemed__gte=0), name='loyalty_account_redeemed_nonnegative'),
        ]
        verbose_name = 'Loyalty account'
        verbose_name_plural = 'Loyalty accounts'

    def __str__(self):
        return f'{self.user} — {self.available_points} points'


class LoyaltyTransaction(models.Model):
    """Append-only audit ledger. Corrections are represented by new rows."""

    ENTRY_REWARD = 'reward'
    ENTRY_REDEMPTION = 'redemption'
    ENTRY_REVERSAL = 'reversal'
    ENTRY_ADJUSTMENT = 'adjustment'
    ENTRY_TYPE_CHOICES = [
        (ENTRY_REWARD, 'Reward'),
        (ENTRY_REDEMPTION, 'Redemption'),
        (ENTRY_REVERSAL, 'Reversal'),
        (ENTRY_ADJUSTMENT, 'Manual adjustment'),
    ]

    account = models.ForeignKey(LoyaltyAccount, on_delete=models.PROTECT, related_name='transactions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='loyalty_transactions')
    event_type = models.ForeignKey(LoyaltyEventType, on_delete=models.PROTECT, related_name='transactions')
    rule = models.ForeignKey(LoyaltyRule, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    purchase_tier = models.ForeignKey(
        'PurchaseRewardTier', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='transactions',
    )
    entry_type = models.CharField(max_length=16, choices=ENTRY_TYPE_CHOICES, default=ENTRY_REWARD)
    points_delta = models.IntegerField()
    idempotency_key = models.CharField(max_length=191, unique=True)
    order = models.ForeignKey('orders.Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='loyalty_transactions')
    qualifying_order_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    product = models.ForeignKey('products.Product', on_delete=models.SET_NULL, null=True, blank=True, related_name='loyalty_transactions')
    related_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='related_loyalty_transactions')
    reversal_of = models.ForeignKey('self', on_delete=models.PROTECT, null=True, blank=True, related_name='reversals')
    description = models.CharField(max_length=300, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']
        indexes = [
            models.Index(fields=['user', '-created_at'], name='loyalty_tx_user_created_idx'),
            models.Index(fields=['event_type', '-created_at'], name='loyalty_tx_event_created_idx'),
            models.Index(fields=['order'], name='loyalty_tx_order_idx'),
        ]
        constraints = [
            models.CheckConstraint(check=~Q(points_delta=0), name='loyalty_tx_nonzero_delta'),
        ]
        verbose_name = 'Loyalty transaction'
        verbose_name_plural = 'Loyalty transactions'

    def __str__(self):
        return f'{self.user} {self.points_delta:+d} ({self.event_type.code})'


class LoyaltyRedemption(models.Model):
    STATUS_AVAILABLE = 'available'
    STATUS_RESERVED = 'reserved'
    STATUS_CONSUMED = 'consumed'
    STATUS_CHOICES = [
        (STATUS_AVAILABLE, 'Available'),
        (STATUS_RESERVED, 'Reserved for checkout'),
        (STATUS_CONSUMED, 'Consumed'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='loyalty_redemptions')
    rule = models.ForeignKey(LoyaltyRedemptionRule, on_delete=models.PROTECT, related_name='redemptions')
    redemption_code = models.CharField(max_length=96, unique=True, default=generate_redemption_code)
    idempotency_key = models.CharField(max_length=191, unique=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_AVAILABLE)
    points_cost = models.PositiveIntegerField()
    reward_type = models.CharField(max_length=20, choices=LoyaltyRedemptionRule.REWARD_TYPE_CHOICES)
    discount_type = models.CharField(max_length=20, choices=LoyaltyRedemptionRule.DISCOUNT_TYPE_CHOICES, null=True, blank=True)
    discount_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    minimum_order_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    maximum_discount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    order = models.ForeignKey('orders.Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='loyalty_redemptions')
    ledger_transaction = models.OneToOneField(
        LoyaltyTransaction, on_delete=models.PROTECT, null=True, blank=True, related_name='redemption_record',
    )
    redeemed_at = models.DateTimeField(auto_now_add=True)
    reserved_at = models.DateTimeField(null=True, blank=True)
    consumed_at = models.DateTimeField(null=True, blank=True)
    released_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f'{self.user} — {self.redemption_code}'


class ReferralAttribution(models.Model):
    """A server-issued, single-use attribution for an explicitly shared product."""

    STATUS_CREATED = 'created'
    STATUS_LANDED = 'landed'
    STATUS_CLAIMED = 'claimed'
    STATUS_VERIFIED = 'verified'
    STATUS_EXPIRED = 'expired'
    STATUS_CHOICES = [
        (STATUS_CREATED, 'Created'),
        (STATUS_LANDED, 'Opened'),
        (STATUS_CLAIMED, 'Claimed at registration'),
        (STATUS_VERIFIED, 'Verified'),
        (STATUS_EXPIRED, 'Expired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    referrer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='product_referrals')
    product = models.ForeignKey('products.Product', on_delete=models.PROTECT, related_name='referral_attributions')
    originating_message = models.ForeignKey(
        'chat.Message', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='referral_attributions',
    )
    # Only a SHA-256 digest is persisted; the bearer token is returned once.
    token_hash = models.CharField(max_length=64, unique=True, editable=False)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_CREATED)
    expires_at = models.DateTimeField()
    first_landed_at = models.DateTimeField(null=True, blank=True)
    last_landed_at = models.DateTimeField(null=True, blank=True)
    landing_count = models.PositiveIntegerField(default=0)
    referred_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name='received_product_referrals',
    )
    claimed_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    qualifying_order = models.ForeignKey(
        'orders.Order', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='referral_attributions',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Referral attribution'
        verbose_name_plural = 'Referral attributions'
        indexes = [
            models.Index(fields=['referrer', '-created_at'], name='referral_referrer_created_idx'),
            models.Index(fields=['status', 'expires_at'], name='referral_status_expiry_idx'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['referred_user'], condition=Q(referred_user__isnull=False),
                name='referral_one_attribution_per_user',
            ),
        ]

    def __str__(self):
        return f'Referral {self.id} for {self.product}'
