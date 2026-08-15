from django.contrib.auth.models import User
from django.db import models
from django.db.models import Q
from django.utils import timezone

from products.models import Product


class SupportDepartmentMembership(models.Model):
    staff = models.ForeignKey(User, on_delete=models.CASCADE, related_name='support_department_memberships')
    department = models.CharField(max_length=20, choices=(('support', 'Support'), ('fashion_stylist', 'Fashion stylist')))
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['staff', 'department'], name='support_staff_department_unique')]
        indexes = [models.Index(fields=['department', 'active', 'staff'], name='support_membership_lookup_idx')]

    def __str__(self):
        return f'{self.staff} - {self.get_department_display()}'


class SupportConversation(models.Model):
    DEPARTMENT_SUPPORT = 'support'
    DEPARTMENT_FASHION_STYLIST = 'fashion_stylist'
    DEPARTMENT_CHOICES = (
        (DEPARTMENT_SUPPORT, 'Support'),
        (DEPARTMENT_FASHION_STYLIST, 'Fashion stylist'),
    )

    STATUS_QUEUED = 'queued'
    STATUS_ASSIGNED = 'assigned'
    STATUS_CLOSED = 'closed'
    STATUS_CHOICES = (
        (STATUS_QUEUED, 'Queued'),
        (STATUS_ASSIGNED, 'Assigned'),
        (STATUS_CLOSED, 'Closed'),
    )

    customer = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='support_conversations'
    )
    department = models.CharField(max_length=20, choices=DEPARTMENT_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_QUEUED)
    assigned_agent = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_support_conversations',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-last_message_at', '-updated_at', '-id']
        indexes = [
            models.Index(fields=['customer', '-updated_at'], name='support_customer_updated_idx'),
            models.Index(fields=['department', 'status', '-updated_at'], name='support_queue_idx'),
            models.Index(fields=['assigned_agent', 'status', '-updated_at'], name='support_agent_idx'),
        ]
        constraints = [
            models.CheckConstraint(
                check=(
                    Q(status='queued', assigned_agent__isnull=True) |
                    Q(status='assigned', assigned_agent__isnull=False) |
                    Q(status='closed')
                ),
                name='support_status_assignment_consistent',
            ),
        ]

    def __str__(self):
        return f'{self.get_department_display()} #{self.pk} ({self.get_status_display()})'

    def mark_message(self, *, now=None):
        now = now or timezone.now()
        self.last_message_at = now
        self.updated_at = now
        self.save(update_fields=['last_message_at', 'updated_at'])


class SupportMessage(models.Model):
    conversation = models.ForeignKey(
        SupportConversation, on_delete=models.CASCADE, related_name='messages'
    )
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='support_messages')
    text = models.TextField(blank=True)
    product = models.ForeignKey(
        Product, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='support_messages',
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['created_at', 'id']
        indexes = [
            models.Index(fields=['conversation', 'created_at', 'id'], name='support_msg_conv_created_idx'),
            models.Index(fields=['conversation', 'is_read'], name='support_msg_conv_read_idx'),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(text__gt='') | Q(product__isnull=False),
                name='support_message_text_or_product',
            ),
        ]

    def __str__(self):
        return f'{self.sender.username}: {self.text[:30]}'
