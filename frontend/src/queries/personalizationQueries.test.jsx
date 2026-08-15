// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { personalizationAPI } from '../services/api';
import { usePersonalizedRecommendations } from './personalizationQueries';

vi.mock('../services/api', () => ({
  personalizationAPI: { getRecommendations: vi.fn() },
}));

const wrapper = (queryClient) => ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('usePersonalizedRecommendations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls the authenticated endpoint with the configured limit and keeps API order', async () => {
    personalizationAPI.getRecommendations.mockResolvedValue({
      data: { results: [{ id: 7 }, { id: 2 }, { id: 7 }] },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => usePersonalizedRecommendations({ enabled: true, limit: 8 }), {
      wrapper: wrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(personalizationAPI.getRecommendations).toHaveBeenCalledWith(
      { limit: 8 },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.current.data.map((product) => product.id)).toEqual([7, 2]);
  });

  it('does not call personalization for guests', async () => {
    const queryClient = new QueryClient();
    renderHook(() => usePersonalizedRecommendations({ enabled: false }), {
      wrapper: wrapper(queryClient),
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(personalizationAPI.getRecommendations).not.toHaveBeenCalled();
  });
});
