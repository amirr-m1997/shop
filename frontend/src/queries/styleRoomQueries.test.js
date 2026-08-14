import { beforeEach, describe, expect, it, vi } from 'vitest';
import { styleRoomsAPI } from '../services/api';
import {
  fetchStyleRoomActivity,
  fetchStyleRoomDetail,
  fetchStyleRoomItems,
  fetchStyleRoomMembers,
  fetchStyleRoomMessages,
  fetchStyleRooms,
  normalizeStyleRoomParams,
  styleRoomKeys,
} from './styleRoomQueries';

vi.mock('../services/api', () => ({
  styleRoomsAPI: {
    list: vi.fn(),
    get: vi.fn(),
    members: vi.fn(),
    items: vi.fn(),
    activity: vi.fn(),
    messages: vi.fn(),
    sendMessage: vi.fn(),
    markMessagesRead: vi.fn(),
  },
}));

const ROOM = { id: '11111111-2222-3333-4444-555555555555', title: 'سفر استایل' };

describe('style room queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates stable, scoped keys for the room list regardless of param order', () => {
    const params = { ordering: '-updated_at', page: 2, page_size: 30 };
    expect(styleRoomKeys.list(params)).toEqual([
      'style-rooms',
      'list',
      normalizeStyleRoomParams(params),
    ]);
    expect(styleRoomKeys.list({ page_size: 30, ordering: '-updated_at', page: 2 }))
      .toEqual(styleRoomKeys.list(params));
  });

  it('strips empty params from list keys', () => {
    expect(normalizeStyleRoomParams({ page: '', search: undefined, page_size: 20 }))
      .toEqual({ page_size: 20 });
  });

  it('scopes room detail and its child collections under the room id', () => {
    const id = ROOM.id;
    expect(styleRoomKeys.detail(id)).toEqual(['style-rooms', 'detail', id]);
    expect(styleRoomKeys.members(id)).toEqual(['style-rooms', 'detail', id, 'members']);
    expect(styleRoomKeys.items(id)).toEqual(['style-rooms', 'detail', id, 'items']);
    expect(styleRoomKeys.activity(id)).toEqual(['style-rooms', 'detail', id, 'activity']);
  });

  it('normalizes paginated room lists into items + pagination metadata', async () => {
    const controller = new AbortController();
    const params = normalizeStyleRoomParams({ ordering: '-updated_at', page: 2 });
    styleRoomsAPI.list.mockResolvedValue({
      data: {
        count: 5,
        next: '/api/style-rooms/?page=3',
        previous: '/api/style-rooms/?page=1',
        results: [{ ...ROOM, id: '11111111-2222-3333-4444-555555555555' }],
      },
    });

    const result = await fetchStyleRooms({
      queryKey: styleRoomKeys.list({ ordering: '-updated_at', page: 2 }),
      signal: controller.signal,
    });

    expect(styleRoomsAPI.list).toHaveBeenCalledWith(params, { signal: controller.signal });
    expect(result).toMatchObject({ count: 5, next: expect.any(String) });
    expect(result.items).toHaveLength(1);
  });

  it('forwards cancellation to the room detail fetch', async () => {
    const controller = new AbortController();
    styleRoomsAPI.get.mockResolvedValue({ data: ROOM });

    const result = await fetchStyleRoomDetail({
      queryKey: styleRoomKeys.detail(ROOM.id),
      signal: controller.signal,
    });

    expect(styleRoomsAPI.get).toHaveBeenCalledWith(ROOM.id, { signal: controller.signal });
    expect(result).toEqual(ROOM);
  });

  it.each([
    ['members', fetchStyleRoomMembers, styleRoomsAPI.members],
    ['items', fetchStyleRoomItems, styleRoomsAPI.items],
    ['activity', fetchStyleRoomActivity, styleRoomsAPI.activity],
  ])('loads the %s collection with a large page size and unwraps items', async (name, fetcher, apiMethod) => {
    const controller = new AbortController();
    apiMethod.mockResolvedValue({
      data: { count: 1, next: null, previous: null, results: [{ id: 1 }] },
    });

    const result = await fetcher({ queryKey: ['style-rooms', 'detail', ROOM.id, name], signal: controller.signal });

    expect(apiMethod).toHaveBeenCalledWith(ROOM.id, { page_size: 100 }, { signal: controller.signal });
    expect(result).toEqual([{ id: 1 }]);
  });

  it('loads each successive message page using the backend pagination cursor', async () => {
    const controller = new AbortController();
    styleRoomsAPI.messages
      .mockResolvedValueOnce({ data: { count: 4, next: '/api/style-rooms/?page=2', results: [{ id: 1 }] } })
      .mockResolvedValueOnce({ data: { count: 4, next: '/api/style-rooms/?page=3', results: [{ id: 2 }] } })
      .mockResolvedValueOnce({ data: { count: 4, next: '/api/style-rooms/?page=4', results: [{ id: 3 }] } })
      .mockResolvedValueOnce({ data: { count: 4, next: null, results: [{ id: 4 }] } });

    for (let page = 1; page <= 4; page += 1) {
      const result = await fetchStyleRoomMessages({
        queryKey: styleRoomKeys.messages(ROOM.id, page),
        signal: controller.signal,
      });
      expect(result.items).toEqual([{ id: page }]);
      if (page < 4) expect(result.next).toEqual(expect.any(String));
      else expect(result.next).toBeNull();
    }

    expect(styleRoomsAPI.messages).toHaveBeenNthCalledWith(
      1, ROOM.id, { page: 1, page_size: 30 }, { signal: controller.signal },
    );
    expect(styleRoomsAPI.messages).toHaveBeenNthCalledWith(
      4, ROOM.id, { page: 4, page_size: 30 }, { signal: controller.signal },
    );
  });
});
