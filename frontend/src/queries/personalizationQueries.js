import { useQuery } from '@tanstack/react-query';
import { personalizationAPI } from '../services/api';

const RECOMMENDATION_LIMIT = 8;

export const personalizationKeys = {
  all: ['personalization'],
  recommendations: (limit) => ['personalization', 'recommendations', limit],
};

const getRecommendationItems = (data) => {
  const items = Array.isArray(data) ? data : data?.results || data?.products || [];
  const seen = new Set();

  return items.filter((product) => {
    const key = product?.id ?? product?.slug;
    if (key == null || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const usePersonalizedRecommendations = ({ enabled, limit = RECOMMENDATION_LIMIT } = {}) => useQuery({
  queryKey: personalizationKeys.recommendations(limit),
  queryFn: ({ signal }) => personalizationAPI
    .getRecommendations({ limit }, { signal })
    .then((response) => getRecommendationItems(response.data)),
  enabled: Boolean(enabled),
  staleTime: 2 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  retry: 1,
});
