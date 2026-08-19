from django.contrib import admin
from django import forms
from django.core.exceptions import ValidationError
from django.contrib.admin import ModelAdmin, TabularInline

from .models import SupportConversation, SupportDepartmentMembership, SupportMessage
from .permissions import has_department_access, is_support_eligible


class SupportDepartmentMembershipForm(forms.ModelForm):
    class Meta:
        model = SupportDepartmentMembership
        fields = '__all__'

    def clean_staff(self):
        staff = self.cleaned_data['staff']
        if not is_support_eligible(staff):
            raise ValidationError('Only support-eligible staff (support agent, fashion stylist, admin, super admin, or Django staff/superuser) can have department memberships.')
        return staff


class SupportConversationAdminForm(forms.ModelForm):
    class Meta:
        model = SupportConversation
        fields = '__all__'

    def clean(self):
        cleaned = super().clean()
        agent = cleaned.get('assigned_agent')
        department = cleaned.get('department')
        if agent and (not agent.is_active or not has_department_access(agent, department)):
            raise ValidationError({'assigned_agent': 'The assigned staff member must be active and belong to this department.'})
        return cleaned


class SupportMessageInline(TabularInline):
    model = SupportMessage
    extra = 0
    can_delete = False
    max_num = 50
    fields = ('sender', 'text', 'product', 'is_read', 'created_at')
    readonly_fields = fields


@admin.register(SupportConversation)
class SupportConversationAdmin(ModelAdmin):
    form = SupportConversationAdminForm
    list_display = ('id', 'customer', 'department', 'status', 'assigned_agent', 'last_message_at', 'created_at')
    list_filter = ('department', 'status', 'created_at', 'updated_at')
    search_fields = ('customer__username', 'assigned_agent__username')
    readonly_fields = ('created_at', 'updated_at', 'closed_at', 'last_message_at')
    inlines = (SupportMessageInline,)

    def get_deleted_objects(self, objs, request):
        deleted_objects, model_count, perms_needed, protected = super().get_deleted_objects(objs, request)
        message_label = SupportMessage._meta.verbose_name
        perms_needed = {label for label in perms_needed if label != message_label}
        return deleted_objects, model_count, perms_needed, protected


@admin.register(SupportDepartmentMembership)
class SupportDepartmentMembershipAdmin(ModelAdmin):
    form = SupportDepartmentMembershipForm
    list_display = ('staff', 'department', 'active', 'created_at', 'updated_at')
    list_filter = ('department', 'active')
    search_fields = ('staff__username', 'staff__email')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(SupportMessage)
class SupportMessageAdmin(ModelAdmin):
    list_display = ('id', 'conversation', 'sender', 'short_text', 'product', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('text', 'sender__username', 'conversation__customer__username')
    readonly_fields = ('conversation', 'sender', 'text', 'product', 'is_read', 'created_at')

    @admin.display(description='Message')
    def short_text(self, obj):
        return obj.text[:80] if obj.text else '—'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
