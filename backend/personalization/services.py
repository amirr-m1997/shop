from django.core.cache import cache
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .models import (
    BehaviorEvent,
    DEFAULT_EVENT_WEIGHTS,
    EventDecayPolicy,
    EventType,
    EventWeight,
    UserPreference,
)
from .taxonomy import product_dimensions


MAX_PREFERENCE_SCORE = 1000
DEFAULT_EVENT_HALF_LIFE_DAYS = {
    EventType.PRODUCT_VIEW: 30,
    EventType.SEARCH: 45,
    EventType.WISHLIST_ADD: 120,
    EventType.WISHLIST_REMOVE: 120,
    EventType.CART_ADD: 90,
    EventType.CART_REMOVE: 90,
    EventType.PURCHASE: 365,
    EventType.REVIEW: 180,
    EventType.PRODUCT_SHARE: 90,
}
RANKING_VERSION_KEY = 'personalization:ranking-version:{user_id}'


def bounded_score(value):
    return max(-MAX_PREFERENCE_SCORE, min(MAX_PREFERENCE_SCORE, int(round(value))))


def ranking_version(user_id):
    return cache.get(RANKING_VERSION_KEY.format(user_id=user_id), 0)


def invalidate_ranking_cache(user_id):
    key = RANKING_VERSION_KEY.format(user_id=user_id)
    try:
        cache.incr(key)
    except ValueError:
        cache.set(key, 1, timeout=None)


def event_weight(event_type):
    configured = EventWeight.objects.filter(event_type=event_type).values_list('weight', flat=True).first()
    return configured if configured is not None else DEFAULT_EVENT_WEIGHTS.get(event_type, 0)


@transaction.atomic
def record_behavior(
    *, user, event_type, product=None, category=None, source='',
    idempotency_key=None, metadata=None, occurred_at=None,
):
    """Append an event and synchronously update explainable affinities."""
    if not user or not user.is_authenticated:
        return None, False

    if idempotency_key is not None:
        existing = BehaviorEvent.objects.filter(
            user=user, event_type=event_type, idempotency_key=idempotency_key,
        ).first()
        if existing:
            return existing, False

    occurred_at = occurred_at or timezone.now()
    event = BehaviorEvent.objects.create(
        user=user,
        event_type=event_type,
        product=product,
        category=category or getattr(product, 'category', None),
        source=source,
        idempotency_key=idempotency_key,
        metadata=metadata or {},
        occurred_at=occurred_at,
    )
    score_delta = event_weight(event_type)
    if product is not None and score_delta:
        for dimension, values in product_dimensions(product).items():
            for value_key, value_label in values:
                preference, _ = UserPreference.objects.select_for_update().get_or_create(
                    user=user,
                    dimension=dimension,
                    value_key=value_key,
                    defaults={'value_label': value_label},
                )
                preference.score = bounded_score(preference.score + score_delta)
                preference.value_label = value_label
                preference.last_event_at = occurred_at
                preference.save(update_fields=['score', 'value_label', 'last_event_at', 'updated_at'])
    invalidate_ranking_cache(user.id)
    return event, True


def _half_life_days(event_type, policies=None):
    if policies is None:
        policies = {
            row.event_type: row.half_life_days
            for row in EventDecayPolicy.objects.all()
        }
    return policies.get(event_type, DEFAULT_EVENT_HALF_LIFE_DAYS.get(event_type, 30))


def recency_factor(event_type, occurred_at, *, now=None, policies=None):
    """Return one deterministic exponential-decay factor for an event."""
    now = now or timezone.now()
    age_days = max(0.0, (now - occurred_at).total_seconds() / 86400)
    half_life = _half_life_days(event_type, policies)
    if half_life <= 0:
        return 0.0
    return 0.5 ** (age_days / half_life)


@transaction.atomic
def refresh_preferences(*, user, now=None):
    """Rebuild a user's explainable preferences from weighted event history."""
    now = now or timezone.now()
    weight_map = {
        row.event_type: row.weight for row in EventWeight.objects.all()
    }
    policy_map = {
        row.event_type: row.half_life_days for row in EventDecayPolicy.objects.all()
    }
    events = BehaviorEvent.objects.filter(user=user).select_related(
        'product', 'product__category', 'product__category__parent',
        'product__brand', 'product__fabric',
    ).prefetch_related('product__variants__color', 'product__images__color')
    totals = {}
    for event in events:
        if not event.product_id:
            continue
        weight = weight_map.get(event.event_type, DEFAULT_EVENT_WEIGHTS.get(event.event_type, 0))
        if not weight:
            continue
        factor = recency_factor(event.event_type, event.occurred_at, now=now, policies=policy_map)
        for dimension, values in product_dimensions(event.product).items():
            for value_key, value_label in values:
                key = (dimension, value_key)
                current = totals.setdefault(key, {'score': 0.0, 'label': value_label, 'last_event_at': event.occurred_at})
                current['score'] += weight * factor
                current['label'] = value_label
                current['last_event_at'] = max(current['last_event_at'], event.occurred_at)

    UserPreference.objects.filter(user=user).delete()
    UserPreference.objects.bulk_create([
        UserPreference(
            user=user,
            dimension=dimension,
            value_key=value_key,
            value_label=data['label'],
            score=bounded_score(data['score']),
            last_event_at=data['last_event_at'],
        )
        for (dimension, value_key), data in sorted(totals.items())
        if bounded_score(data['score']) != 0
    ])
    invalidate_ranking_cache(user.id)
    return list(UserPreference.objects.filter(user=user))


def record_product_view(*, user, product, source='product_detail'):
    return record_behavior(user=user, event_type=EventType.PRODUCT_VIEW, product=product, source=source)


def record_product_share(*, user, product, source, idempotency_key, metadata=None):
    return record_behavior(
        user=user,
        event_type=EventType.PRODUCT_SHARE,
        product=product,
        source=source,
        idempotency_key=idempotency_key,
        metadata=metadata,
    )


def record_purchase_events_for_order(*, order, payment):
    """Record one purchase event per item after the confirmed payment state."""
    if (
        payment is None
        or payment.status != 'success'
        or order.payment_status != 'paid'
        or order.user_id is None
    ):
        return []

    events = []
    for item in order.items.select_related('product').all():
        if item.product_id is None:
            continue
        event, _ = record_behavior(
            user=order.user,
            event_type=EventType.PURCHASE,
            product=item.product,
            source='purchase',
            idempotency_key=f'purchase:order-item:{item.pk}',
            metadata={
                'order_id': order.pk,
                'order_item_id': item.pk,
                'payment_id': payment.pk,
                'quantity': item.quantity,
            },
        )
        events.append(event)
    return events
