from dataclasses import dataclass
from math import ceil

from django.core.cache import cache
from django.db.models import Q

from products.models import Product
from products.serializers import ProductListSerializer

from .models import TaxonomyDimension, UserPreference
from .services import ranking_version
from .taxonomy import product_dimensions


DEFAULT_CANDIDATE_LIMIT = 200
MAX_RANKING_LIMIT = 50
RANKING_CACHE_SECONDS = 120
RANKING_DIMENSION_WEIGHTS = {
    TaxonomyDimension.GENDER: 1.0,
    TaxonomyDimension.CATEGORY: 1.0,
    TaxonomyDimension.SUBCATEGORY: 1.0,
    TaxonomyDimension.BRAND: 1.0,
    TaxonomyDimension.FABRIC: 1.0,
    TaxonomyDimension.COLOR: 1.0,
}


@dataclass(frozen=True)
class RankedProduct:
    product: Product
    score: float
    reasons: tuple


def available_products_queryset():
    """Use the same product/variant stock semantics as cart availability."""
    variant_available = Q(variants__stock__gt=0) | Q(
        variants__stock__isnull=True,
        variants__product__stock__gt=0,
    )
    return Product.objects.filter(is_active=True).filter(
        Q(stock__gt=0) | variant_available
    ).distinct()


def _hydrated_products(queryset):
    return queryset.select_related(
        'brand', 'category', 'category__parent', 'fabric',
    ).prefetch_related('variants__color', 'images__color')


def _preference_map(user):
    return {
        (preference.dimension, preference.value_key): preference
        for preference in UserPreference.objects.filter(user=user)
    }


def _confident_preferences(preferences):
    return {
        key: preference
        for key, preference in preferences.items()
        if abs(preference.score) >= 5
    }


def _matches_preferences(preferences):
    query = Q()
    for (dimension, value_key), preference in preferences.items():
        if preference.score == 0:
            continue
        if dimension == TaxonomyDimension.GENDER:
            query |= Q(main_category=value_key)
        elif dimension == TaxonomyDimension.SUBCATEGORY:
            query |= Q(category__slug=value_key)
        elif dimension == TaxonomyDimension.CATEGORY:
            query |= Q(category__slug=value_key) | Q(category__parent__slug=value_key)
        elif dimension == TaxonomyDimension.BRAND:
            query |= Q(brand__slug=value_key)
        elif dimension == TaxonomyDimension.FABRIC:
            try:
                query |= Q(fabric_id=int(value_key))
            except (TypeError, ValueError):
                continue
        elif dimension == TaxonomyDimension.COLOR:
            try:
                color_id = int(value_key)
            except (TypeError, ValueError):
                continue
            query |= Q(variants__color_id=color_id) | Q(images__color_id=color_id)
    return query


def select_candidates(user, *, candidate_limit=DEFAULT_CANDIDATE_LIMIT):
    """Return a bounded affinity pool, or the existing cold-start ordering."""
    candidate_limit = max(1, min(candidate_limit, DEFAULT_CANDIDATE_LIMIT))
    base = available_products_queryset()
    preferences = _confident_preferences(_preference_map(user))
    match_query = _matches_preferences(preferences)
    if match_query.children:
        matched = _hydrated_products(base.filter(match_query).order_by('-created_at', '-id'))[:candidate_limit]
        products = list(matched)
        if len(products) >= candidate_limit:
            return products, False
        selected_ids = {product.id for product in products}
    else:
        products = []
        selected_ids = set()

    fallback = base.exclude(id__in=selected_ids).order_by(
        '-is_trending', '-is_featured', '-is_new_arrival', '-rating', '-created_at', '-id'
    )[:candidate_limit - len(products)]
    return products + list(_hydrated_products(fallback)), not bool(preferences)


def _product_group(product):
    dimensions = product_dimensions(product)
    values = dimensions.get(TaxonomyDimension.SUBCATEGORY) or dimensions.get(TaxonomyDimension.CATEGORY) or []
    return values[0][0] if values else None


def _score_product(product, preferences):
    score = 0.0
    reasons = []
    for dimension, values in product_dimensions(product).items():
        dimension_weight = RANKING_DIMENSION_WEIGHTS[dimension]
        for value_key, value_label in values:
            preference = preferences.get((dimension, value_key))
            if preference is None or preference.score == 0:
                continue
            contribution = preference.score * dimension_weight
            score += contribution
            reasons.append({
                'dimension': dimension,
                'value': value_key,
                'label': value_label,
                'affinity': preference.score,
                'contribution': contribution,
            })
    reasons.sort(key=lambda reason: (-reason['contribution'], reason['dimension'], reason['value']))
    return score, tuple(reasons)


def _diversify(ranked, limit):
    if not ranked:
        return []
    cap = max(1, ceil(limit * 0.4))
    selected = []
    deferred = []
    counts = {}
    for item in ranked:
        group = _product_group(item.product)
        if group is not None and counts.get(group, 0) >= cap:
            deferred.append(item)
            continue
        selected.append(item)
        if group is not None:
            counts[group] = counts.get(group, 0) + 1
        if len(selected) == limit:
            return selected
    return (selected + deferred)[:limit]


def _cache_key(user_id, limit, version):
    return f'personalization:ranking:{user_id}:{version}:{limit}'


class ProductRankingService:
    def rank(self, *, user, limit=20, candidates=None, use_cache=True):
        limit = max(1, min(int(limit), MAX_RANKING_LIMIT))
        can_cache = candidates is None and use_cache
        version = ranking_version(user.id)
        key = _cache_key(user.id, limit, version)
        if can_cache:
            cached = cache.get(key)
            if cached is not None:
                return self._hydrate_cached(cached)

        preferences = _confident_preferences(_preference_map(user))
        if candidates is None:
            candidates, cold_start = select_candidates(user, candidate_limit=max(limit * 10, 40))
        else:
            supplied = list(candidates)
            available_ids = set(
                available_products_queryset().filter(
                    id__in=[product.id for product in supplied]
                ).values_list('id', flat=True)
            )
            candidates = [product for product in supplied if product.id in available_ids]
            cold_start = not bool(preferences)

        if cold_start:
            ranked = [RankedProduct(product, 0.0, tuple()) for product in candidates]
        else:
            scored = []
            for product in candidates:
                score, reasons = _score_product(product, preferences)
                scored.append((score, product, reasons))
            scored.sort(
                key=lambda row: (
                    -row[0],
                    -int(row[1].is_trending),
                    -int(row[1].is_featured),
                    -int(row[1].is_new_arrival),
                    -float(row[1].rating),
                    -row[1].created_at.timestamp(),
                    -row[1].id,
                )
            )
            ranked = _diversify(
                [RankedProduct(product, score, reasons) for score, product, reasons in scored],
                limit,
            )

        ranked = ranked[:limit]
        if can_cache:
            cache.set(
                key,
                [
                    {'id': item.product.id, 'score': item.score, 'reasons': item.reasons}
                    for item in ranked
                ],
                RANKING_CACHE_SECONDS,
            )
        return ranked

    def _hydrate_cached(self, cached):
        ids = [row['id'] for row in cached]
        products = {
            product.id: product
            for product in _hydrated_products(available_products_queryset().filter(id__in=ids))
        }
        return [
            RankedProduct(products[row['id']], row['score'], tuple(row['reasons']))
            for row in cached
            if row['id'] in products
        ]


def serialize_ranked_products(ranked, *, context=None):
    return ProductListSerializer(
        [item.product for item in ranked], many=True, context=context or {},
    ).data
