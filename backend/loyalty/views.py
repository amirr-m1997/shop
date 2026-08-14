from django.conf import settings
from django.db import models
from django.db.models import Count, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.http import HttpResponseNotFound
from django.shortcuts import redirect
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from chat.models import Message
from products.models import Product

from .models import LoyaltyAccount, LoyaltyRedemption, LoyaltyRedemptionRule, ReferralAttribution, LoyaltyTransaction
from .serializers import (
    LoyaltySummarySerializer, ReferralAttributionCreateSerializer,
    LoyaltyRedemptionRuleSerializer, LoyaltyRedemptionSerializer, LoyaltyTransactionSerializer,
)
from .services import (
    REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_SALT, REFERRAL_TOKEN_TTL,
    ReferralError, create_referral_attribution, get_valid_referral_by_token,
    get_valid_referral_cookie,
    InsufficientLoyaltyPoints, RedemptionError, redeem_loyalty_reward,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def loyalty_summary_view(request):
    """Return a non-mutating summary; old users are not auto-provisioned on GET."""
    account = LoyaltyAccount.objects.filter(user=request.user).first()
    if account is None:
        return Response({
            'account_exists': False,
            'available_points': 0,
            'total_earned': 0,
            'total_redeemed': 0,
            'created_at': None,
            'updated_at': None,
        })
    data = LoyaltySummarySerializer(account).data
    data['account_exists'] = True
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def redemption_rewards_view(request):
    now = timezone.now()
    rules = LoyaltyRedemptionRule.objects.filter(is_active=True).filter(
        models.Q(starts_at__isnull=True) | models.Q(starts_at__lte=now),
        models.Q(ends_at__isnull=True) | models.Q(ends_at__gte=now),
    ).filter(
        models.Q(usage_limit__isnull=True) | models.Q(used_count__lt=models.F('usage_limit')),
    ).order_by('-priority', 'id')
    account = LoyaltyAccount.objects.filter(user=request.user).first()
    return Response({
        'available_points': account.available_points if account else 0,
        'rewards': LoyaltyRedemptionRuleSerializer(rules, many=True).data,
        'history': LoyaltyRedemptionSerializer(
            LoyaltyRedemption.objects.filter(user=request.user).select_related('rule'), many=True,
        ).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def redeem_reward_view(request):
    rule_id = request.data.get('rule_id')
    idempotency_key = request.data.get('idempotency_key') or request.headers.get('Idempotency-Key')
    try:
        redemption = redeem_loyalty_reward(
            user=request.user, rule_id=int(rule_id), idempotency_key=idempotency_key,
        )
    except (TypeError, ValueError, LoyaltyRedemptionRule.DoesNotExist):
        return Response({'detail': 'Redemption rule not found.'}, status=status.HTTP_404_NOT_FOUND)
    except InsufficientLoyaltyPoints as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except RedemptionError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(LoyaltyRedemptionSerializer(redemption).data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def redemption_history_view(request):
    redemptions = LoyaltyRedemption.objects.filter(user=request.user).select_related('rule')
    return Response(LoyaltyRedemptionSerializer(redemptions, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def transaction_history_view(request):
    transactions = LoyaltyTransaction.objects.filter(user=request.user).select_related(
        'event_type', 'rule', 'order', 'product',
    ).order_by('-created_at', '-id')
    paginator = PageNumberPagination()
    paginator.page_size = 20
    page = paginator.paginate_queryset(transactions, request)
    return paginator.get_paginated_response(LoyaltyTransactionSerializer(page, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def referral_summary_view(request):
    referrals = ReferralAttribution.objects.filter(referrer=request.user)
    status_counts = referrals.values('status').annotate(count=Count('id'))
    counts = {row['status']: row['count'] for row in status_counts}
    referral_event_codes = ('referral-registration', 'referral-purchase')
    rewards_earned = LoyaltyTransaction.objects.filter(
        user=request.user,
        event_type__code__in=referral_event_codes,
    ).aggregate(total=Coalesce(Sum('points_delta'), Value(0)))['total']
    return Response({
        'total_activity': referrals.count(),
        'status_counts': counts,
        'successful_referrals': counts.get(ReferralAttribution.STATUS_VERIFIED, 0),
        'referred_users': referrals.filter(referred_user__isnull=False).values('referred_user').distinct().count(),
        'referral_rewards_earned': rewards_earned,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_referral_view(request):
    """Issue a referral link only for a sender's explicit product message/share."""
    serializer = ReferralAttributionCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    product = Product.objects.filter(pk=serializer.validated_data['product_id'], is_active=True).first()
    if product is None:
        return Response({'detail': 'Active product not found.'}, status=status.HTTP_404_NOT_FOUND)
    message = None
    if 'message_id' in serializer.validated_data:
        message = Message.objects.filter(pk=serializer.validated_data['message_id']).first()
        if message is None:
            return Response({'detail': 'Product message not found.'}, status=status.HTTP_404_NOT_FOUND)
    try:
        attribution, token = create_referral_attribution(
            referrer=request.user, product=product, originating_message=message,
        )
    except ReferralError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    referral_url = request.build_absolute_uri(reverse('loyalty-referral-open', kwargs={'token': token}))
    return Response({
        'id': str(attribution.id),
        'referral_url': referral_url,
        'expires_at': attribution.expires_at,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def referral_open_view(request, token):
    """Set first-valid-link attribution then take the visitor to the product page."""
    attribution = get_valid_referral_by_token(token)
    if attribution is None:
        return HttpResponseNotFound('Referral link is invalid or expired.')

    # Canonical attribution policy: the first valid referral opened in a browser
    # wins; later links do not overwrite it before registration.
    existing = get_valid_referral_cookie(request)
    response = redirect(f'{settings.FRONTEND_URL}/product/{attribution.product.slug}')
    if existing is None:
        now = attribution.last_landed_at = timezone.now()
        if attribution.first_landed_at is None:
            attribution.first_landed_at = now
        attribution.landing_count += 1
        attribution.status = ReferralAttribution.STATUS_LANDED
        attribution.save(update_fields=['first_landed_at', 'last_landed_at', 'landing_count', 'status', 'updated_at'])
        max_age = max(1, int((attribution.expires_at - now).total_seconds()))
        response.set_signed_cookie(
            REFERRAL_COOKIE_NAME, str(attribution.id), salt=REFERRAL_COOKIE_SALT,
            max_age=min(max_age, int(REFERRAL_TOKEN_TTL.total_seconds())), httponly=True,
            secure=settings.AUTH_TOKEN_COOKIE_SECURE, samesite='Lax',
        )
    return response
