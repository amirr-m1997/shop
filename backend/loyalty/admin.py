from uuid import uuid4

from django import forms
from django.contrib import admin, messages
from django.http import Http404
from django.shortcuts import redirect, render
from django.urls import path, reverse
from django.utils.html import format_html

from unfold.admin import ModelAdmin, TabularInline

from .models import (
    LoyaltyAccount, LoyaltyEventType, LoyaltyRule, LoyaltyTransaction,
    PurchaseRewardTier, ReferralAttribution, LoyaltyRedemptionRule, LoyaltyRedemption,
)
from .services import InsufficientLoyaltyPoints, LoyaltyError, record_loyalty_transaction


@admin.register(LoyaltyRedemptionRule)
class LoyaltyRedemptionRuleAdmin(ModelAdmin):
    list_display = ('name', 'code', 'reward_type', 'points_required', 'priority', 'is_active', 'starts_at', 'ends_at')
    list_filter = ('reward_type', 'is_active', 'discount_type')
    search_fields = ('name', 'code')
    list_editable = ('priority', 'is_active')


@admin.register(LoyaltyRedemption)
class LoyaltyRedemptionAdmin(ModelAdmin):
    list_display = ('user', 'rule', 'redemption_code', 'status', 'points_cost', 'order', 'redeemed_at')
    list_filter = ('status', 'reward_type', 'redeemed_at')
    search_fields = ('user__username', 'redemption_code', 'idempotency_key')
    readonly_fields = [field.name for field in LoyaltyRedemption._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return request.method in ('GET', 'HEAD')

    def has_delete_permission(self, request, obj=None):
        return False


class PurchaseRewardTierInline(TabularInline):
    model = PurchaseRewardTier
    extra = 0
    fields = ('name', 'minimum_order_total', 'maximum_order_total', 'points', 'priority', 'is_active', 'starts_at', 'ends_at')


@admin.register(LoyaltyEventType)
class LoyaltyEventTypeAdmin(ModelAdmin):
    list_display = ('name', 'code', 'is_active', 'updated_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'code', 'description')
    prepopulated_fields = {'code': ('name',)}


@admin.register(LoyaltyRule)
class LoyaltyRuleAdmin(ModelAdmin):
    list_display = ('name', 'code', 'event_type', 'points', 'priority', 'is_active', 'starts_at', 'ends_at')
    list_filter = ('is_active', 'event_type')
    search_fields = ('name', 'code', 'event_type__code')
    list_editable = ('priority', 'is_active')
    prepopulated_fields = {'code': ('name',)}
    inlines = (PurchaseRewardTierInline,)


@admin.register(PurchaseRewardTier)
class PurchaseRewardTierAdmin(ModelAdmin):
    list_display = ('name', 'rule', 'minimum_order_total', 'maximum_order_total', 'points', 'priority', 'is_active')
    list_filter = ('is_active', 'rule__event_type')
    search_fields = ('name', 'rule__name', 'rule__code')
    list_editable = ('priority', 'is_active')


class ManualAdjustmentForm(forms.Form):
    nonce = forms.CharField(widget=forms.HiddenInput())
    event_type = forms.ModelChoiceField(queryset=LoyaltyEventType.objects.none())
    points_delta = forms.IntegerField(help_text='Use a positive value to credit and a negative value to debit.')
    description = forms.CharField(max_length=300, required=True, widget=forms.Textarea(attrs={'rows': 3}))

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['event_type'].queryset = LoyaltyEventType.objects.filter(is_active=True).order_by('name')

    def clean_points_delta(self):
        value = self.cleaned_data['points_delta']
        if value == 0:
            raise forms.ValidationError('The adjustment must not be zero.')
        return value


@admin.register(LoyaltyAccount)
class LoyaltyAccountAdmin(ModelAdmin):
    list_display = ('user', 'available_points', 'total_earned', 'total_redeemed', 'updated_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('user', 'available_points', 'total_earned', 'total_redeemed', 'created_at', 'updated_at', 'manual_adjustment_link')
    fields = readonly_fields
    ordering = ('-updated_at',)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return request.method in ('GET', 'HEAD')

    def save_model(self, request, obj, form, change):
        raise PermissionError('Loyalty balances must be changed through the ledger service.')

    @admin.display(description='Audited adjustment')
    def manual_adjustment_link(self, obj):
        url = reverse('admin:loyalty_loyaltyaccount_adjust', args=[obj.pk])
        return format_html('<a class="button" href="{}">Create audited adjustment</a>', url)

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('<int:account_id>/adjust/', self.admin_site.admin_view(self.adjust_view), name='loyalty_loyaltyaccount_adjust'),
        ]
        return custom_urls + urls

    def adjust_view(self, request, account_id):
        account = LoyaltyAccount.objects.select_related('user').filter(pk=account_id).first()
        if account is None:
            raise Http404('Loyalty account not found.')
        if request.method == 'POST':
            form = ManualAdjustmentForm(request.POST)
            if form.is_valid():
                try:
                    result = record_loyalty_transaction(
                        user=account.user,
                        event_type=form.cleaned_data['event_type'],
                        points_delta=form.cleaned_data['points_delta'],
                        idempotency_key=f'admin-adjustment:{account.pk}:{request.user.pk}:{form.cleaned_data["nonce"]}',
                        entry_type=LoyaltyTransaction.ENTRY_ADJUSTMENT,
                        description=form.cleaned_data['description'],
                        metadata={'admin_user_id': request.user.pk},
                    )
                except (LoyaltyError, ValueError) as exc:
                    form.add_error(None, str(exc))
                else:
                    if result.created:
                        self.message_user(request, 'The audited adjustment was recorded.', level=messages.SUCCESS)
                    else:
                        self.message_user(request, 'This adjustment was already recorded.', level=messages.INFO)
                    return redirect(reverse('admin:loyalty_loyaltyaccount_change', args=[account.pk]))
        else:
            form = ManualAdjustmentForm(initial={'nonce': uuid4().hex})
        context = {
            **self.admin_site.each_context(request),
            'title': f'Adjust loyalty points for {account.user}',
            'account': account,
            'form': form,
            'opts': self.model._meta,
        }
        return render(request, 'admin/loyalty/loyaltyaccount/adjust.html', context)


@admin.register(LoyaltyTransaction)
class LoyaltyTransactionAdmin(ModelAdmin):
    list_display = ('id', 'user', 'event_type', 'entry_type', 'points_delta', 'rule', 'order', 'created_at')
    list_filter = ('entry_type', 'event_type', 'created_at')
    search_fields = ('user__username', 'idempotency_key', 'description', 'order__order_number')
    readonly_fields = (
        'account', 'user', 'event_type', 'rule', 'entry_type', 'points_delta',
        'purchase_tier', 'idempotency_key', 'order', 'qualifying_order_amount',
        'product', 'related_user', 'reversal_of',
        'description', 'metadata', 'created_at',
    )
    fields = readonly_fields
    ordering = ('-created_at', '-id')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return request.method in ('GET', 'HEAD')

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ReferralAttribution)
class ReferralAttributionAdmin(ModelAdmin):
    list_display = ('id', 'referrer', 'referred_user', 'product', 'status', 'expires_at', 'verified_at')
    list_filter = ('status',)
    search_fields = ('referrer__username', 'referred_user__username', 'product__name')
    readonly_fields = (
        'id', 'referrer', 'product', 'originating_message', 'token_hash', 'status', 'expires_at',
        'first_landed_at', 'last_landed_at', 'landing_count', 'referred_user', 'claimed_at',
        'verified_at', 'qualifying_order', 'created_at', 'updated_at',
    )
    fields = readonly_fields

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return request.method in ('GET', 'HEAD')

    def has_delete_permission(self, request, obj=None):
        return False
