from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """فقط کاربران با نقش admin یا super_admin"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.profile.role in ('admin', 'super_admin')
        except Exception:
            return False


class IsSuperAdmin(BasePermission):
    """فقط کاربران با نقش super_admin"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.profile.role == 'super_admin'
        except Exception:
            return False


class IsAdminOrModerator(BasePermission):
    """کاربران با نقش admin، super_admin یا moderator"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.profile.role in ('admin', 'super_admin', 'moderator')
        except Exception:
            return False


class CanDeleteProduct(BasePermission):
    """فقط super_admin اجازه حذف محصول دارد"""
    def has_permission(self, request, view):
        if request.method != 'DELETE':
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.profile.role == 'super_admin'
        except Exception:
            return False
