"""Cursor pagination for chat/support message threads.

The first page is always the newest messages, returned in chronological
order so the client can render them from top to bottom. Older pages are
requested with ``?before=<id>``.
"""

from django.db.models import Q
from rest_framework.response import Response


class MessageCursorPagination:
    default_limit = 50
    max_limit = 100

    def paginate(self, request, queryset, serializer_class, context=None):
        try:
            limit = int(request.query_params.get('limit', self.default_limit))
        except (TypeError, ValueError):
            limit = self.default_limit
        limit = max(1, min(limit, self.max_limit))

        newest_first = queryset.order_by('-created_at', '-id')
        before = request.query_params.get('before')
        if before not in (None, ''):
            try:
                before_id = int(before)
            except (TypeError, ValueError):
                return Response({'error': 'before باید شناسه عددی پیام باشد.'}, status=400)
            anchor = queryset.model.objects.filter(pk=before_id).only('id', 'created_at').first()
            if anchor is None:
                return Response({'error': 'پیام مبنا یافت نشد.'}, status=404)
            newest_first = newest_first.filter(
                Q(created_at__lt=anchor.created_at)
                | Q(created_at=anchor.created_at, id__lt=anchor.id)
            )

        rows = list(newest_first[: limit + 1])
        has_older = len(rows) > limit
        rows = rows[:limit]
        rows.reverse()
        data = serializer_class(rows, many=True, context=context or {}).data
        return Response({
            'results': data,
            'has_older': has_older,
            'oldest_id': rows[0].id if rows else None,
            'newest_id': rows[-1].id if rows else None,
        })
