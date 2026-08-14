from django.contrib import admin

from .models import StyleRoom, StyleRoomEvent, StyleRoomItem, StyleRoomMember


@admin.register(StyleRoom)
class StyleRoomAdmin(admin.ModelAdmin):
    list_display = ('title', 'owner', 'visibility', 'invite_revoked', 'created_at')
    list_filter = ('visibility', 'invite_revoked')
    search_fields = ('title', 'owner__username')
    readonly_fields = ('id', 'invite_token_hash', 'invite_expires_at', 'invite_revoked', 'created_at', 'updated_at')


@admin.register(StyleRoomMember)
class StyleRoomMemberAdmin(admin.ModelAdmin):
    list_display = ('room', 'user', 'role', 'joined_at')
    list_filter = ('role',)
    search_fields = ('room__title', 'user__username')


@admin.register(StyleRoomItem)
class StyleRoomItemAdmin(admin.ModelAdmin):
    list_display = ('room', 'product', 'added_by', 'created_at')
    search_fields = ('room__title', 'product__name')


@admin.register(StyleRoomEvent)
class StyleRoomEventAdmin(admin.ModelAdmin):
    list_display = ('type', 'room', 'actor', 'created_at')
    list_filter = ('type',)
    search_fields = ('room__title',)
    readonly_fields = ('type', 'actor', 'payload', 'created_at')