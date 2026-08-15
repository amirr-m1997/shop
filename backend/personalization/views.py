from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .ranking import ProductRankingService, serialize_ranked_products


class RecommendationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            limit = int(request.query_params.get('limit', 20))
        except (TypeError, ValueError):
            limit = 20
        ranking = ProductRankingService().rank(user=request.user, limit=limit)
        return Response({
            'results': serialize_ranked_products(ranking, context={'request': request}),
            'count': len(ranking),
        })
