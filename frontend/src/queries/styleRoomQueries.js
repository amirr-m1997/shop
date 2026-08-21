import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { styleRoomsAPI } from '../services/api';

/**
 * Room list params are canonicalized (sorted, empty values stripped) so the
 * same filter set always maps to the same query key — mirrors productQueries.
 */
export const normalizeStyleRoomParams = (params) => Object.fromEntries(
  Object.entries(params || {})
    .filter(([, value]) => value !== '' && value !== undefined && value !== null)
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
);

export const styleRoomKeys = {
  all: ['style-rooms'],
  lists: () => [...styleRoomKeys.all, 'list'],
  list: (params) => [...styleRoomKeys.lists(), normalizeStyleRoomParams(params)],
  details: () => [...styleRoomKeys.all, 'detail'],
  detail: (roomId) => [...styleRoomKeys.details(), roomId],
  members: (roomId) => [...styleRoomKeys.detail(roomId), 'members'],
  items: (roomId) => [...styleRoomKeys.detail(roomId), 'items'],
  activity: (roomId) => [...styleRoomKeys.detail(roomId), 'activity'],
  messages: (roomId, page = 1) => [...styleRoomKeys.detail(roomId), 'messages', page],
};

const unwrapPaginated = (data) => {
  const items = data.results || data || [];
  return {
    items,
    count: data.count ?? items.length,
    next: data.next ?? null,
    previous: data.previous ?? null,
  };
};

export const fetchStyleRooms = async ({ queryKey, signal }) => {
  const [, , params] = queryKey;
  const response = await styleRoomsAPI.list(params, { signal });
  return unwrapPaginated(response.data);
};

export const fetchStyleRoomDetail = async ({ queryKey, signal }) => {
  const [, , roomId] = queryKey;
  const response = await styleRoomsAPI.get(roomId, { signal });
  return response.data;
};

export const fetchStyleRoomMembers = async ({ queryKey, signal }) => {
  const [, , roomId] = queryKey;
  const response = await styleRoomsAPI.members(roomId, { page_size: 100 }, { signal });
  return unwrapPaginated(response.data).items;
};

export const fetchStyleRoomItems = async ({ queryKey, signal }) => {
  const [, , roomId] = queryKey;
  const response = await styleRoomsAPI.items(roomId, { page_size: 100 }, { signal });
  return unwrapPaginated(response.data).items;
};

export const fetchStyleRoomActivity = async ({ queryKey, signal }) => {
  const [, , roomId] = queryKey;
  const response = await styleRoomsAPI.activity(roomId, { page_size: 100 }, { signal });
  return unwrapPaginated(response.data).items;
};

export const fetchStyleRoomMessages = async ({ queryKey, signal }) => {
  const roomId = queryKey[2];
  const page = queryKey[4] || 1;
  const response = await styleRoomsAPI.messages(roomId, { page, page_size: 30 }, { signal });
  return unwrapPaginated(response.data);
};

export const useStyleRoomsQuery = (params) => useQuery({
  queryKey: styleRoomKeys.list(params),
  queryFn: fetchStyleRooms,
  staleTime: 30_000,
});

export const useStyleRoomDetailQuery = (roomId) => useQuery({
  queryKey: styleRoomKeys.detail(roomId),
  queryFn: fetchStyleRoomDetail,
  enabled: Boolean(roomId),
  staleTime: 30_000,
});

export const useStyleRoomMembersQuery = (roomId) => useQuery({
  queryKey: styleRoomKeys.members(roomId),
  queryFn: fetchStyleRoomMembers,
  enabled: Boolean(roomId),
  staleTime: 30_000,
});

export const useStyleRoomItemsQuery = (roomId) => useQuery({
  queryKey: styleRoomKeys.items(roomId),
  queryFn: fetchStyleRoomItems,
  enabled: Boolean(roomId),
  staleTime: 30_000,
});

export const useStyleRoomActivityQuery = (roomId) => useQuery({
  queryKey: styleRoomKeys.activity(roomId),
  queryFn: fetchStyleRoomActivity,
  enabled: Boolean(roomId),
  staleTime: 30_000,
});

export const useStyleRoomMessagesQuery = (roomId, page = 1) => useQuery({
  queryKey: styleRoomKeys.messages(roomId, page),
  queryFn: fetchStyleRoomMessages,
  enabled: Boolean(roomId),
  staleTime: 5_000,
});

/**
 * Room-scoped but list-aware refresh. Invalidating the detail key also hits
 * its child keys (members/items/activity) via prefix matching.
 */
const invalidateRoom = (queryClient, roomId) => {
  queryClient.invalidateQueries({ queryKey: styleRoomKeys.detail(roomId) });
  queryClient.invalidateQueries({ queryKey: styleRoomKeys.lists() });
};

/** Persist a fresh room resource into the detail cache (e.g. after join). */
const cacheRoom = (queryClient, room) => {
  if (room?.id) {
    queryClient.setQueryData(styleRoomKeys.detail(room.id), room);
  }
  queryClient.invalidateQueries({ queryKey: styleRoomKeys.lists() });
};

export const useCreateStyleRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => styleRoomsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: styleRoomKeys.lists() });
    },
  });
};

export const useUpdateStyleRoom = (roomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => styleRoomsAPI.update(roomId, data),
    onSuccess: () => invalidateRoom(queryClient, roomId),
  });
};

export const useDeleteStyleRoom = (roomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => styleRoomsAPI.remove(roomId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: styleRoomKeys.detail(roomId) });
      queryClient.invalidateQueries({ queryKey: styleRoomKeys.lists() });
    },
  });
};

export const useGenerateInvite = (roomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => styleRoomsAPI.invite(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: styleRoomKeys.detail(roomId) });
    },
  });
};

export const useJoinStyleRoom = (roomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token) => styleRoomsAPI.join(roomId, { token: token.trim() }),
    onSuccess: (response) => {
      cacheRoom(queryClient, response.data);
    },
  });
};

export const useLeaveStyleRoom = (roomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => styleRoomsAPI.leave(roomId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: styleRoomKeys.detail(roomId) });
      queryClient.invalidateQueries({ queryKey: styleRoomKeys.lists() });
    },
  });
};

export const useAddStyleRoomMember = (roomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => styleRoomsAPI.addMember(roomId, data),
    onSuccess: () => invalidateRoom(queryClient, roomId),
  });
};

export const useRemoveStyleRoomMember = (roomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) => styleRoomsAPI.removeMember(roomId, userId),
    onSuccess: () => invalidateRoom(queryClient, roomId),
  });
};

export const useAddStyleRoomItem = (roomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId) => styleRoomsAPI.addItem(roomId, { product_id: productId }),
    onSuccess: () => invalidateRoom(queryClient, roomId),
  });
};

export const useRemoveStyleRoomItem = (roomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId) => styleRoomsAPI.removeItem(roomId, itemId),
    onSuccess: () => invalidateRoom(queryClient, roomId),
  });
};

export const useSendStyleRoomMessage = (roomId) => {
  const queryClient = useQueryClient();
  const retryKeys = new WeakMap();
  return useMutation({
    mutationFn: (data) => {
      let idempotencyKey = data?.idempotency_key || retryKeys.get(data);
      if (!idempotencyKey) {
        idempotencyKey = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        if (data && typeof data === 'object') retryKeys.set(data, idempotencyKey);
      }
      return styleRoomsAPI.sendMessage(roomId, { ...data, idempotency_key: idempotencyKey });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...styleRoomKeys.detail(roomId), 'messages'] });
    },
  });
};

export const useMarkStyleRoomMessagesRead = (roomId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data = {}) => styleRoomsAPI.markMessagesRead(roomId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...styleRoomKeys.detail(roomId), 'messages'] });
    },
  });
};
