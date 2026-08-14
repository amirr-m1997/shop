from rest_framework import serializers

from .models import LoyaltyAccount, LoyaltyRedemption, LoyaltyRedemptionRule, LoyaltyTransaction


class ReferralAttributionCreateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    message_id = serializers.IntegerField(min_value=1, required=False)


class LoyaltySummarySerializer(serializers.ModelSerializer):
    account_exists = serializers.BooleanField(read_only=True)

    class Meta:
        model = LoyaltyAccount
        fields = ['account_exists', 'available_points', 'total_earned', 'total_redeemed', 'created_at', 'updated_at']


class LoyaltyRedemptionRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyRedemptionRule
        fields = [
            'id', 'code', 'name', 'reward_type', 'points_required', 'discount_type',
            'discount_value', 'minimum_order_value', 'maximum_discount', 'priority',
            'starts_at', 'ends_at',
        ]


class LoyaltyRedemptionSerializer(serializers.ModelSerializer):
    rule_name = serializers.CharField(source='rule.name', read_only=True)

    class Meta:
        model = LoyaltyRedemption
        fields = [
            'id', 'redemption_code', 'status', 'points_cost', 'reward_type',
            'discount_type', 'discount_value', 'minimum_order_value',
            'maximum_discount', 'rule_name', 'order', 'redeemed_at',
            'reserved_at', 'consumed_at', 'released_at',
        ]
        read_only_fields = fields


class LoyaltyTransactionSerializer(serializers.ModelSerializer):
    event = serializers.SerializerMethodField()
    rule = serializers.SerializerMethodField()
    order_reference = serializers.SerializerMethodField()
    product_reference = serializers.SerializerMethodField()

    class Meta:
        model = LoyaltyTransaction
        fields = [
            'id', 'event', 'entry_type', 'points_delta', 'created_at', 'description',
            'order_reference', 'product_reference', 'rule',
        ]
        read_only_fields = fields

    def get_event(self, obj):
        return {'code': obj.event_type.code, 'name': obj.event_type.name}

    def get_rule(self, obj):
        if not obj.rule:
            return None
        return {'code': obj.rule.code, 'name': obj.rule.name}

    def get_order_reference(self, obj):
        if not obj.order:
            return None
        return {'order_number': obj.order.order_number}

    def get_product_reference(self, obj):
        if not obj.product:
            return None
        return {'name': obj.product.name, 'slug': obj.product.slug}
