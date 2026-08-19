// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ChatPage from './ChatPage';
import { useChatVisibilityRefresh } from '../hooks/useChatVisibilityRefresh';

const mocks = vi.hoisted(() => ({
  getConversations: vi.fn(),
  getMessages: vi.fn(),
  markRead: vi.fn(() => Promise.resolve({ data: {} })),
  sendMessage: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('../services/api', () => ({
  chatAPI: {
    getConversations: mocks.getConversations,
    getMessages: mocks.getMessages,
    markRead: mocks.markRead,
    sendMessage: mocks.sendMessage,
    createConversation: vi.fn(() => Promise.resolve({ data: { id: 99 } })),
    acceptConversation: vi.fn(),
    declineConversation: vi.fn(),
    cancelConversation: vi.fn(),
    clearConversation: vi.fn(),
    blockConversation: vi.fn(),
    unblockConversation: vi.fn(),
    contactStylist: vi.fn(),
  },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 9, username: 'qa-user', role: 'user' } }),
}));

vi.mock('../components/ui/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('../hooks/useChatVisibilityRefresh', () => ({
  useChatVisibilityRefresh: vi.fn(),
}));

vi.mock('../hooks/useChatUserSearch', () => ({
  useChatUserSearch: () => ({ query: '', setQuery: vi.fn(), searchResults: [], setSearchResults: vi.fn(), searching: false }),
}));

function mockChatDashboard({ model }) {
  return (
    <div data-testid="chat-dashboard">
      <div
        data-testid="messages-viewport"
        ref={model.messagesScrollRef}
        onScroll={model.handleMessagesScroll}
      >
        {model.messages.map((message) => (
          <div key={message.id} data-testid={`message-${message.id}`}>{message.text}</div>
        ))}
      </div>
      <button type="button" data-testid="select-conversation-7" onClick={() => model.selectConversation(7)} />
      <button type="button" data-testid="send-message" onClick={() => model.handleSend(null, 'سلام')} />
    </div>
  );
}

vi.mock('../components/chat/ChatDashboard', () => ({ default: mockChatDashboard }));

const conversation42 = { id: 42, other_user: { id: 5, username: 'other' }, status: 'accepted', unread_count: 0 };
const conversation7 = { id: 7, other_user: { id: 6, username: 'second' }, status: 'accepted', unread_count: 0 };

const renderChat = () => render(
  <MemoryRouter initialEntries={['/chat/42']}>
    <Routes>
      <Route path="/chat/:conversationId" element={<ChatPage />} />
    </Routes>
  </MemoryRouter>
);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('ChatPage infinite pagination', () => {
  it('loads the latest page first and marks the conversation read', async () => {
    mocks.getConversations.mockResolvedValue({ data: [conversation42] });
    mocks.getMessages.mockResolvedValue({ data: {
      count: 55,
      previous: 'http://testserver/api/chat/conversations/42/messages/?page=1',
      next: null,
      results: [
        { id: 51, sender_id: 9, text: 'پیام ۵۱', created_at: '2026-08-17T10:00:00Z', is_read: true },
        { id: 52, sender_id: 5, text: 'پیام ۵۲', created_at: '2026-08-17T10:01:00Z', is_read: false },
      ],
    } });

    renderChat();

    await waitFor(() => expect(mocks.getMessages).toHaveBeenCalledWith(42, { params: { page: 'last' } }));
    expect(await screen.findByText('پیام ۵۲')).toBeTruthy();
    expect(screen.getByText('پیام ۵۱')).toBeTruthy();
    expect(mocks.markRead).toHaveBeenCalledWith(42);
  });

  it('loads older messages on scroll-to-top, merging without duplicates and anchoring scroll', async () => {
    mocks.getConversations.mockResolvedValue({ data: [conversation42] });
    mocks.getMessages
      .mockResolvedValueOnce({ data: {
        count: 150,
        previous: 'http://testserver/api/chat/conversations/42/messages/?page=2',
        next: null,
        results: [
          { id: 101, sender_id: 9, text: 'm101', created_at: '2026-08-17T09:00:00Z', is_read: true },
          { id: 150, sender_id: 5, text: 'm150', created_at: '2026-08-17T10:00:00Z', is_read: false },
        ],
      } })
      .mockResolvedValueOnce({ data: {
        count: 150,
        previous: 'http://testserver/api/chat/conversations/42/messages/?page=1',
        next: 'http://testserver/api/chat/conversations/42/messages/?page=3',
        results: [
          { id: 51, sender_id: 9, text: 'm51', created_at: '2026-08-17T08:00:00Z', is_read: true },
          { id: 101, sender_id: 9, text: 'm101', created_at: '2026-08-17T09:00:00Z', is_read: true },
        ],
      } });

    renderChat();
    await screen.findByText('m150');
    await waitFor(() => expect(mocks.getMessages).toHaveBeenCalledWith(42, { params: { page: 'last' } }));

    const viewport = screen.getByTestId('messages-viewport');
    Object.defineProperty(viewport, 'scrollHeight', { value: 1000, configurable: true });
    viewport.scrollTop = 40;

    fireEvent.scroll(viewport);

    await waitFor(() => expect(mocks.getMessages).toHaveBeenCalledWith(42, { params: { page: 2 } }));
    expect(await screen.findByText('m51')).toBeTruthy();
    expect(screen.getByText('m150')).toBeTruthy();
    expect(viewport.scrollTop).toBe(40);
  });

  it('resets messages and pagination when switching conversations', async () => {
    mocks.getConversations.mockResolvedValue({ data: [conversation42, conversation7] });
    mocks.getMessages
      .mockResolvedValueOnce({ data: {
        count: 55,
        previous: 'http://testserver/api/chat/conversations/42/messages/?page=1',
        next: null,
        results: [{ id: 51, sender_id: 5, text: 'from 42', created_at: '2026-08-17T10:00:00Z', is_read: false }],
      } })
      .mockResolvedValueOnce({ data: {
        count: 3,
        previous: null,
        next: null,
        results: [{ id: 1, sender_id: 6, text: 'from 7', created_at: '2026-08-17T10:00:00Z', is_read: false }],
      } });

    renderChat();
    await screen.findByText('from 42');
    fireEvent.click(screen.getByTestId('select-conversation-7'));
    await waitFor(() => expect(mocks.getMessages).toHaveBeenLastCalledWith(7, { params: { page: 'last' } }));
    await screen.findByText('from 7');
    expect(screen.queryByText('from 42')).toBeNull();
  });

  it('drops a stale response when the conversation changes mid-flight', async () => {
    mocks.getConversations.mockResolvedValue({ data: [conversation42, conversation7] });
    let resolve42;
    mocks.getMessages
      .mockImplementationOnce(() => new Promise((resolve) => { resolve42 = resolve; }))
      .mockResolvedValueOnce({ data: {
        count: 1,
        previous: null,
        next: null,
        results: [{ id: 1, sender_id: 6, text: 'second chat', created_at: '2026-08-17T10:00:00Z', is_read: false }],
      } });

    renderChat();
    await waitFor(() => expect(mocks.getMessages).toHaveBeenCalledWith(42, { params: { page: 'last' } }));

    fireEvent.click(screen.getByTestId('select-conversation-7'));
    await waitFor(() => expect(mocks.getMessages).toHaveBeenCalledWith(7, { params: { page: 'last' } }));
    await screen.findByText('second chat');

    await act(async () => {
      resolve42({ data: {
        count: 55,
        previous: 'http://testserver/api/chat/conversations/42/messages/?page=1',
        next: null,
        results: [{ id: 51, sender_id: 5, text: 'stale', created_at: '2026-08-17T09:00:00Z', is_read: false }],
      } });
    });
    expect(screen.queryByText('stale')).toBeNull();
    expect(screen.getByText('second chat')).toBeTruthy();
  });

  it('merges an optimistic message and replaces it with the server response', async () => {
    mocks.getConversations.mockResolvedValue({ data: [conversation42] });
    mocks.getMessages.mockResolvedValue({ data: {
      count: 1,
      previous: null,
      next: null,
      results: [{ id: 1, sender_id: 5, text: 'welcome', created_at: '2026-08-17T10:00:00Z', is_read: false }],
    } });
    let resolveSend;
    mocks.sendMessage.mockImplementationOnce(() => new Promise((resolve) => { resolveSend = resolve; }));

    renderChat();
    await screen.findByText('welcome');

    fireEvent.click(screen.getByTestId('send-message'));
    expect(screen.getByText('سلام')).toBeTruthy();

    await act(async () => {
      resolveSend({ data: { id: 2, sender_id: 9, text: 'سلام', created_at: '2026-08-17T10:05:00Z', is_read: false } });
    });
    expect(screen.getByTestId('message-2')).toBeTruthy();
    expect(screen.queryByTestId(/^message-temp-/)).toBeNull();
  });

  it('wires the visibility refresh to the pagination-aware message loader', async () => {
    mocks.getConversations.mockResolvedValue({ data: [conversation42] });
    mocks.getMessages.mockResolvedValue({ data: {
      count: 55,
      previous: 'http://testserver/api/chat/conversations/42/messages/?page=1',
      next: null,
      results: [{ id: 51, sender_id: 5, text: 'welcome', created_at: '2026-08-17T10:00:00Z', is_read: false }],
    } });

    renderChat();
    await screen.findByText('welcome');

    const args = useChatVisibilityRefresh.mock.calls.at(-1)[0];
    expect(typeof args.refreshMessages).toBe('function');

    mocks.getMessages.mockClear();
    await act(async () => { await args.refreshMessages(42); });
    expect(mocks.getMessages).toHaveBeenCalledWith(42, { params: { page: 'last' } });
  });
});