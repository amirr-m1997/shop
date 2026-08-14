// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { styleRoomsAPI } from '../services/api';
import { useAddStyleRoomItem, useRemoveStyleRoomItem } from './styleRoomQueries';

vi.mock('../services/api', () => ({
  styleRoomsAPI: {
    addItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

const ROOM_ID = '11111111-2222-3333-4444-555555555555';

const makeWrapper = (queryClient) =>
  function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

describe('useAddStyleRoomItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts exactly one add request per click to /style-rooms/{id}/items/ with { product_id }', async () => {
    const queryClient = new QueryClient();
    styleRoomsAPI.addItem.mockResolvedValue({ data: { id: 1 } });

    const { result } = renderHook(() => useAddStyleRoomItem(ROOM_ID), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync(42);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(styleRoomsAPI.addItem).toHaveBeenCalledTimes(1);
    expect(styleRoomsAPI.addItem).toHaveBeenCalledWith(ROOM_ID, { product_id: 42 });
    expect(result.current.isPending).toBe(false);
  });

  it('invalidates the room detail subtree and lists after a successful add', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    styleRoomsAPI.addItem.mockResolvedValue({ data: { id: 1 } });

    const { result } = renderHook(() => useAddStyleRoomItem(ROOM_ID), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync(42);
    });

    const keys = invalidateSpy.mock.calls.map(([options]) => options.queryKey);
    expect(keys).toEqual([
      ['style-rooms', 'detail', ROOM_ID],
      ['style-rooms', 'list'],
    ]);
  });

  it('returns to idle pending state after a 400 duplicate error (no stuck spinner)', async () => {
    const queryClient = new QueryClient();
    styleRoomsAPI.addItem.mockRejectedValue({
      response: { status: 400, data: { error: 'این محصول قبلاً در اتاق وجود دارد.' } },
    });

    const { result } = renderHook(() => useAddStyleRoomItem(ROOM_ID), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(42)).rejects.toMatchObject({
        response: { status: 400 },
      });
    });

    expect(styleRoomsAPI.addItem).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isPending).toBe(false);
  });

  it('returns to idle after a 403 forbidden error', async () => {
    const queryClient = new QueryClient();
    styleRoomsAPI.addItem.mockRejectedValue({
      response: { status: 403, data: { detail: 'دسترسی ندارید.' } },
    });

    const { result } = renderHook(() => useAddStyleRoomItem(ROOM_ID), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(42)).rejects.toMatchObject({
        response: { status: 403 },
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isPending).toBe(false);
  });

  it('returns to idle after a network failure (no response payload)', async () => {
    const queryClient = new QueryClient();
    styleRoomsAPI.addItem.mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useAddStyleRoomItem(ROOM_ID), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(42)).rejects.toThrow('Network Error');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isPending).toBe(false);
  });
});

describe('useRemoveStyleRoomItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts the item id to remove and invalidates the room subtree on success', async () => {
    const queryClient = new QueryClient();
    styleRoomsAPI.removeItem.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useRemoveStyleRoomItem(ROOM_ID), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync(99);
    });

    expect(styleRoomsAPI.removeItem).toHaveBeenCalledTimes(1);
    expect(styleRoomsAPI.removeItem).toHaveBeenCalledWith(ROOM_ID, 99);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isPending).toBe(false);
  });
});
