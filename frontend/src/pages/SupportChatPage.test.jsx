// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SupportChatPage from './SupportChatPage';
import ChatWorkspace from '../components/chat/ChatWorkspace';

const listConversations = vi.fn();
const createConversation = vi.fn();
const getMessages = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 9, username: 'qa-user', role: 'user' } }),
}));

vi.mock('../components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../services/api', () => ({
  productsAPI: { getProducts: vi.fn(() => Promise.resolve({ data: { results: [] } })) },
  supportAPI: {
    listConversations: (...args) => listConversations(...args),
    createConversation: (...args) => createConversation(...args),
    getMessages: (...args) => getMessages(...args),
    markRead: vi.fn(() => Promise.resolve({ data: {} })),
    sendMessage: vi.fn(), close: vi.fn(), reopen: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SupportChatPage', () => {
  it('keeps the chat workspace mounted when Customer Support is selected', async () => {
    listConversations.mockResolvedValue({ data: [] });
    createConversation.mockResolvedValue({ data: { id: 42, department: 'support', status: 'queued', unread_count: 0 } });
    getMessages.mockResolvedValue({ data: [] });

    const { container } = render(<MemoryRouter initialEntries={['/support']}><Routes><Route element={<ChatWorkspace />}><Route path="/support" element={<SupportChatPage />} /></Route></Routes></MemoryRouter>);
    await screen.findByText('برای شروع، یکی از گزینه‌های بالا را انتخاب کنید.');
    const workspace = screen.getByTestId('support-chat-workspace');

    fireEvent.click(screen.getByRole('button', { name: /پشتیبانی مشتری/ }));

    await waitFor(() => expect(getMessages).toHaveBeenCalledWith(42));
    expect(screen.getByTestId('support-chat-workspace')).toBe(workspace);
    expect(screen.getByTestId('support-message-pane')).toBeTruthy();
    expect(container.querySelector('[aria-label="Chat modes"]')).toBeTruthy();
  });

  it('keeps the same workspace when Fashion Stylist is selected', async () => {
    listConversations.mockResolvedValue({ data: [] });
    createConversation.mockResolvedValue({ data: { id: 71, department: 'fashion_stylist', status: 'queued', unread_count: 0 } });
    getMessages.mockResolvedValue({ data: [] });

    render(<MemoryRouter initialEntries={['/support']}><Routes><Route element={<ChatWorkspace />}><Route path="/support" element={<SupportChatPage />} /></Route></Routes></MemoryRouter>);
    await screen.findByText('برای شروع، یکی از گزینه‌های بالا را انتخاب کنید.');
    const workspace = screen.getByTestId('support-chat-workspace');
    fireEvent.click(screen.getByRole('button', { name: /مشاوره با استایلیست/ }));

    await waitFor(() => expect(getMessages).toHaveBeenCalledWith(71));
    expect(screen.getByTestId('support-chat-workspace')).toBe(workspace);
    expect(screen.getByText('استایلیست مد')).toBeTruthy();
  });
});
