const createdStamp = (message) => {
  const value = new Date(message?.created_at || 0).getTime();
  return Number.isFinite(value) ? value : 0;
};

const numericId = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const mergeMessages = (current = [], incoming = []) => {
  const messagesById = new Map(current.map((message) => [String(message.id), message]));
  incoming.forEach((message) => {
    if (message == null || message.id == null) return;
    messagesById.set(String(message.id), message);
  });
  return [...messagesById.values()].sort((first, second) => {
    const createdAt = createdStamp(first) - createdStamp(second);
    if (createdAt) return createdAt;
    const firstId = numericId(first.id);
    const secondId = numericId(second.id);
    if (firstId != null && secondId != null) return firstId - secondId;
    if (firstId == null && secondId != null) return 1;
    if (firstId != null && secondId == null) return -1;
    return String(first.id).localeCompare(String(second.id));
  });
};

export const replaceOptimisticMessage = (current = [], optimisticId, serverMessage) => {
  const withoutOptimistic = current.filter((message) => String(message.id) !== String(optimisticId));
  return mergeMessages(withoutOptimistic, serverMessage ? [serverMessage] : []);
};

export const unwrapMessagePage = (payload) => {
  if (Array.isArray(payload)) {
    return { results: payload, hasOlder: false, oldestId: payload[0]?.id ?? null };
  }
  const results = payload?.results || [];
  return {
    results,
    hasOlder: Boolean(payload?.has_older ?? payload?.previous),
    oldestId: payload?.oldest_id ?? results[0]?.id ?? null,
  };
};
