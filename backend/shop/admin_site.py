"""Native Django Admin dashboard wiring.

The idiomatic way to customize the admin index is a ``AdminSite`` subclass
registered via ``default_site`` on ``AdminConfig`` in ``INSTALLED_APPS``.
settings.py is intentionally frozen in this project, so instead the stock
``admin.site`` is kept unchanged and only its index view is extended: the
dashboard context is injected through the native ``extra_context`` mechanism
and a custom ``index_template`` is set. All model registrations and the
runtime Persian localization performed by ``AdminLocalizationMiddleware``
continue to use the stock site untouched.
"""

from django.contrib import admin

from .admin_dashboard import dashboard_context


_stock_index = admin.site.index


def _index_with_dashboard(request, extra_context=None):
    context = dict(extra_context) if extra_context else {}
    context.update(dashboard_context(request))
    return _stock_index(request, extra_context=context)


admin.site.index_template = 'admin/shop_index.html'
admin.site.index = _index_with_dashboard