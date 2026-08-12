import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'shop.settings'
django.setup()

from dashboard.models import AdminPermission, AdminRole, AdminRolePermission

perms_data = [
    ('view-products', 'view-products', 'products'),
    ('create-product', 'create-product', 'products'),
    ('edit-product', 'edit-product', 'products'),
    ('delete-product', 'delete-product', 'products'),
    ('view-orders', 'view-orders', 'orders'),
    ('change-order-status', 'change-order-status', 'orders'),
    ('view-customers', 'view-customers', 'customers'),
    ('view-reports', 'view-reports', 'reports'),
    ('export-reports', 'export-reports', 'reports'),
    ('view-calendar', 'view-calendar', 'reports'),
    ('manage-settings', 'manage-settings', 'settings'),
    ('manage-users', 'manage-users', 'users'),
    ('manage-notes', 'manage-notes', 'orders'),
]

for slug, name, cat in perms_data:
    AdminPermission.objects.get_or_create(slug=slug, defaults={'name': name, 'category': cat})

all_perms = list(AdminPermission.objects.all())

roles_data = [
    ('super_admin', 'super_admin', True, all_perms),
    ('admin', 'admin', False, [p for p in all_perms if p.slug not in ('delete-product', 'manage-users')]),
    ('moderator', 'moderator', False, [p for p in all_perms if p.slug in ('view-products', 'view-orders', 'change-order-status', 'view-customers', 'view-reports', 'view-calendar')]),
]

for name, slug, default, perms in roles_data:
    role, _ = AdminRole.objects.get_or_create(slug=slug, defaults={'name': name, 'is_default': default})
    AdminRolePermission.objects.filter(role=role).delete()
    for p in perms:
        AdminRolePermission.objects.get_or_create(role=role, permission=p)
    print(f'{name}: {len(perms)} permissions assigned')

print('Done.')
