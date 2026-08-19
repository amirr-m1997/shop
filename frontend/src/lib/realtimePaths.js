export const chatUserSocketPath = (userId) => `/ws/chat/user/${userId}/`;
export const chatPrivateSocketPath = (conversationId) => `/ws/chat/private/${conversationId}/`;
export const styleRoomSocketPath = (roomId) => `/ws/style-rooms/${roomId}/`;
export const supportConversationSocketPath = (conversationId) => (
  `/ws/support/conversations/${conversationId}/`
);
export const supportDepartmentSocketPath = (department) => (
  `/ws/support/departments/${department}/`
);
