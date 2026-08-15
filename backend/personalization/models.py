from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


class EventType(models.TextChoices):
    PRODUCT_VIEW = 'product_view', 'Product view'
    SEARCH = 'search', 'Search'
    WISHLIST_ADD = 'wishlist_add', 'Wishlist add'
    WISHLIST_REMOVE = 'wishlist_remove', 'Wishlist remove'
    CART_ADD = 'cart_add', 'Cart add'
    CART_REMOVE = 'cart_remove', 'Cart remove'
    PURCHASE = 'purchase', 'Purchase'
    REVIEW = 'review', 'Review'
    PRODUCT_SHARE = 'product_share', 'Product share'


class TaxonomyDimension(models.TextChoices):
    GENDER = 'gender', 'Gender / main category'
    CATEGORY = 'category', 'Category'
    SUBCATEGORY = 'subcategory', 'Subcategory'
    BRAND = 'brand', 'Brand'
    FABRIC = 'fabric', 'Fabric'
    COLOR = 'color', 'Color'


DEFAULT_EVENT_WEIGHTS = {
    EventType.PRODUCT_VIEW: 1,
    EventType.SEARCH: 3,
    EventType.WISHLIST_ADD: 6,
    EventType.CART_ADD: 8,
    EventType.PURCHASE: 15,
    EventType.REVIEW: 5,
    EventType.PRODUCT_SHARE: 4,
    EventType.WISHLIST_REMOVE: -4,
    EventType.CART_REMOVE: -3,
}


class EventWeight(models.Model):
    event_type = models.CharField(max_length=32, choices=EventType.choices, unique=True)
    weight = models.IntegerField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['event_type']

    def __str__(self):
        return f'{self.get_event_type_display()}: {self.weight}'


class EventDecayPolicy(models.Model):
    event_type = models.CharField(max_length=32, choices=EventType.choices, unique=True)
    half_life_days = models.PositiveIntegerField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['event_type']

    def __str__(self):
        return f'{self.get_event_type_display()}: {self.half_life_days} days'


class BehaviorEvent(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='personalization_events',
    )
    event_type = models.CharField(max_length=32, choices=EventType.choices)
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='personalization_events',
    )
    category = models.ForeignKey(
        'products.Category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='personalization_events',
    )
    source = models.CharField(max_length=64, blank=True)
    idempotency_key = models.CharField(max_length=191, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    occurred_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-occurred_at', '-id']
        indexes = [
            models.Index(fields=['user', '-occurred_at'], name='pe_event_user_time_idx'),
            models.Index(fields=['user', 'event_type', '-occurred_at'], name='pe_event_user_type_idx'),
            models.Index(fields=['product', '-occurred_at'], name='pe_event_product_time_idx'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'event_type', 'idempotency_key'],
                condition=Q(idempotency_key__isnull=False),
                name='pe_event_user_type_key_unique',
            ),
        ]

    def __str__(self):
        return f'{self.user} - {self.get_event_type_display()} - {self.occurred_at}'


class UserPreference(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='personalization_preferences',
    )
    dimension = models.CharField(max_length=32, choices=TaxonomyDimension.choices)
    value_key = models.CharField(max_length=191)
    value_label = models.CharField(max_length=191, blank=True)
    score = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)
    last_event_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-score', 'dimension', 'value_key']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'dimension', 'value_key'],
                name='pe_preference_user_dimension_value_unique',
            ),
        ]
        indexes = [
            models.Index(fields=['user', 'dimension', 'value_key'], name='pe_pref_user_dim_value_idx'),
            models.Index(fields=['user', '-score'], name='pe_pref_user_score_idx'),
        ]

    def __str__(self):
        return f'{self.user} - {self.dimension}:{self.value_key} = {self.score}'
