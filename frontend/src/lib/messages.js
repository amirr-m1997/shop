const createdStamp = (message) => {
  const value = new Date(message?.created_at || 0).getTime();
  return Number.isFinite(value) ? value : 0;
};

const numericId = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const STATUS_RANK = { failed: 0, sent: 1, delivered: 2, seen: 3 };

export const mergeMessages = (current = [], incoming = []) => {
  const messagesById = new Map(current.map((message) => [String(message.id), message]));
  // Also index by idempotency_key for temp->real reconciliation
  const keyToId = new Map();
  current.forEach((m) => {
    if (m?.idempotency_key) keyToId.set(String(m.idempotency_key), String(m.id));
  });
  incoming.forEach((message) => {
    if (message == null || message.id == null) return;
    const key = String(message.id);
    // If incoming has same idempotency_key as a pending temp, remove the temp
    if (message.idempotency_key) {
      const tempId = keyToId.get(String(message.idempotency_key));
      if (tempId && tempId !== key && messagesById.has(tempId)) {
        messagesById.delete(tempId);
        keyToId.delete(String(message.idempotency_key));
      }
    }
    const prev = messagesById.get(key);
    if (prev) {
      const prevRank = STATUS_RANK[prev.status] ?? (prev.status == null ? -1 : 0);
      const nextRank = STATUS_RANK[message.status] ?? (message.status == null ? -1 : 0);
      const status = message.status == null || nextRank < prevRank ? prev.status : message.status;
      const isRead = message.is_read == null ? prev.is_read : (message.is_read || prev.is_read);
      // Preserve valid fields if incoming has null/undefined and prev has value
      const merged = { ...prev, ...message, status, is_read: isRead };
      // If incoming lacks idempotency_key but prev has it, keep it
      if (!merged.idempotency_key && prev.idempotency_key) merged.idempotency_key = prev.idempotency_key;
      messagesById.set(key, merged);
    } else {
      messagesById.set(key, message);
    }
    if (message.idempotency_key) keyToId.set(String(message.idempotency_key), key);
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
