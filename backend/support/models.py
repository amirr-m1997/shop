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

    PRIORITY_NORMAL = 'normal'
    PRIORITY_HIGH = 'high'
    PRIORITY_URGENT = 'urgent'
    PRIORITY_CHOICES = (
        (PRIORITY_NORMAL, 'Normal'),
        (PRIORITY_HIGH, 'High'),
        (PRIORITY_URGENT, 'Urgent'),
    )

    customer = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='support_conversations'
    )
    department = models.CharField(max_length=20, choices=DEPARTMENT_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_QUEUED)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default=PRIORITY_NORMAL)
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
            models.Index(fields=['department', 'status', 'created_at'], name='support_queue_created_idx'),
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
            models.UniqueConstraint(
                fields=['customer', 'department'],
                condition=~Q(status='closed'),
                name='support_one_open_conversation_per_department',
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


class SupportAssignment(models.Model):
    ACTION_CLAIM = 'claim'
    ACTION_ASSIGN = 'assign'
    ACTION_REASSIGN = 'reassign'
    ACTION_AUTO = 'auto'
    ACTION_REQUEUE = 'requeue'
    ACTION_CHOICES = (
        (ACTION_CLAIM, 'Claim'),
        (ACTION_ASSIGN, 'Assign'),
        (ACTION_REASSIGN, 'Reassign'),
        (ACTION_AUTO, 'Auto'),
        (ACTION_REQUEUE, 'Requeue'),
    )

    conversation = models.ForeignKey(
        SupportConversation, on_delete=models.CASCADE, related_name='assignments'
    )
    agent = models.ForeignKey(User, on_delete=models.CASCADE, related_name='+')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    actor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+'
    )
    previous_agent = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['conversation', '-created_at'], name='support_assign_conv_idx'),
            models.Index(fields=['agent', '-created_at'], name='support_assign_agent_idx'),
        ]

    def __str__(self):
        return f'{self.get_action_display()} #{self.pk} (conversation {self.conversation_id})'


class SupportAgentPresence(models.Model):
    STATUS_ONLINE = 'online'
    STATUS_AWAY = 'away'
    STATUS_OFFLINE = 'offline'
    STATUS_CHOICES = (
        (STATUS_ONLINE, 'Online'),
        (STATUS_AWAY, 'Away'),
        (STATUS_OFFLINE, 'Offline'),
    )

    staff = models.OneToOneField(User, on_delete=models.CASCADE, related_name='support_presence')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_OFFLINE)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    heartbeat_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['status', '-last_seen_at'], name='support_presence_seen_idx'),
        ]

    def __str__(self):
        return f'{self.staff.username} presence ({self.get_status_display()})'
