export const mergeMessages = (current = [], incoming = []) => {
  const messagesById = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => messagesById.set(message.id, message));
  return [...messagesById.values()].sort((first, second) => {
    const createdAt = new Date(first.created_at).getTime() - new Date(second.created_at).getTime();
    return createdAt || Number(first.id) - Number(second.id);
  });
};