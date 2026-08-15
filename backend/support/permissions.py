from rest_framework.permissions import BasePermission


SUPPORT_AGENT = 'support_agent'
FASHION_STYLIST = 'fashion_stylist'


def role_for(user):
    profile = getattr(user, 'profile', None)
    return profile.role if profile else None


def departments_for(user):
    if not getattr(user, 'is_active', False) or role_for(user) not in (SUPPORT_AGENT, FASHION_STYLIST):
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
