from django.contrib import admin

from .models import BehaviorEvent, EventDecayPolicy, EventWeight, UserPreference


@admin.register(EventWeight)
class EventWeightAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'weight', 'updated_at')
    list_editable = ('weight',)
    list_filter = ('event_type',)


@admin.register(EventDecayPolicy)
class EventDecayPolicyAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'half_life_days', 'updated_at')
    list_editable = ('half_life_days',)
    list_filter = ('event_type',)


@admin.register(BehaviorEvent)
class BehaviorEventAdmin(admin.ModelAdmin):
    list_display = ('user', 'event_type', 'product', 'source', 'occurred_at', 'idempotency_key')
    list_filter = ('event_type', 'source', 'occurred_at')
    search_fields = ('user__username', 'product__name', 'idempotency_key')
    readonly_fields = tuple(field.name for field in BehaviorEvent._meta.fields)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'dimension', 'value_key', 'score', 'last_event_at', 'updated_at')
    list_filter = ('dimension',)
    search_fields = ('user__username', 'value_key', 'value_label')
    readonly_fields = ('user', 'dimension', 'value_key', 'value_label', 'score', 'last_event_at', 'updated_at')
