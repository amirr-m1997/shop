from rest_framework.permissions import BasePermission


SUPPORT_AGENT = 'support_agent'
FASHION_STYLIST = 'fashion_stylist'
ADMIN = 'admin'
SUPER_ADMIN = 'super_admin'

ELIGIBLE_ROLES = (SUPPORT_AGENT, FASHION_STYLIST, ADMIN, SUPER_ADMIN)


def role_for(user):
    profile = getattr(user, 'profile', None)
    return profile.role if profile else None


def is_support_eligible(user):
    if not getattr(user, 'is_active', False):
        return False
    if getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False):
        return True
    return role_for(user) in ELIGIBLE_ROLES


def departments_for(user):
    if not is_support_eligible(user):
        return set()
    from .models import SupportDepartmentMembership
    return set(SupportDepartmentMembership.objects.filter(staff=user, active=True).values_list('department', flat=True))


def has_department_access(user, department):
    return department in departments_for(user)


def is_support_staff(user):
    return bool(departments_for(user))


def department_for(user):
    departments = departments_for(user)
    return next(iter(departments), None) if len(departments) == 1 else None


class IsSupportStaff(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and is_support_staff(request.user))
