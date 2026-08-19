// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SupportChatPage from './SupportChatPage';
import ChatWorkspace from '../components/chat/ChatWorkspace';

const listConversations = vi.fn();
const createConversation = vi.fn();
const getMessages = vi.fn();
const reopen = vi.fn();

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
    sendMessage: vi.fn(), close: vi.fn(), reopen: (...args) => reopen(...args),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
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

    await waitFor(() => expect(getMessages).toHaveBeenCalledWith(42, { limit: 50 }));
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

    await waitFor(() => expect(getMessages).toHaveBeenCalledWith(71, { limit: 50 }));
    expect(screen.getByTestId('support-chat-workspace')).toBe(workspace);
    expect(screen.getByText('استایلیست مد')).toBeTruthy();
  });

  it('reuses an existing open conversation instead of creating a duplicate', async () => {
    listConversations.mockResolvedValue({ data: [{ id: 42, department: 'support', status: 'queued', unread_count: 0 }] });
    getMessages.mockResolvedValue({ data: [] });

    render(<MemoryRouter initialEntries={['/support']}><Routes><Route element={<ChatWorkspace />}><Route path="/support" element={<SupportChatPage />} /></Route></Routes></MemoryRouter>);
    await screen.findByText('پشتیبانی مشتری');
    fireEvent.click(within(screen.getByLabelText('شروع گفت‌وگوی پشتیبانی')).getByRole('button', { name: /پشتیبانی مشتری/ }));

    await waitFor(() => expect(getMessages).toHaveBeenCalledWith(42, { limit: 50 }));
    expect(createConversation).not.toHaveBeenCalled();
    expect(screen.getByText('گفت‌وگو را شروع کنید')).toBeTruthy();
  });

  it('reopens a closed conversation instead of creating a duplicate', async () => {
    reopen.mockResolvedValue({ data: { id: 42, department: 'support', status: 'queued', unread_count: 0 } });
    listConversations.mockResolvedValue({ data: [{ id: 42, department: 'support', status: 'closed', unread_count: 0 }] });
    getMessages.mockResolvedValue({ data: [] });

    render(<MemoryRouter initialEntries={['/support']}><Routes><Route element={<ChatWorkspace />}><Route path="/support" element={<SupportChatPage />} /></Route></Routes></MemoryRouter>);
    await screen.findByText('پشتیبانی مشتری');
    fireEvent.click(within(screen.getByLabelText('شروع گفت‌وگوی پشتیبانی')).getByRole('button', { name: /پشتیبانی مشتری/ }));

    await waitFor(() => expect(reopen).toHaveBeenCalledWith(42));
    await waitFor(() => expect(getMessages).toHaveBeenCalledWith(42, { limit: 50 }));
    expect(createConversation).not.toHaveBeenCalled();
  });

  it('displays sender names on message bubbles', async () => {
    listConversations.mockResolvedValue({ data: [{ id: 42, department: 'support', status: 'assigned', assigned_agent: { id: 5, username: 'agent', display_name: 'Agent One' }, unread_count: 0 }] });
    getMessages.mockResolvedValue({ data: [
      { id: 1, sender: { id: 9, username: 'qa-user', display_name: 'QA User' }, text: 'سلام', created_at: '2026-08-17T10:00:00Z' },
      { id: 2, sender: { id: 5, username: 'agent', display_name: 'Agent One' }, text: 'در خدمتم', created_at: '2026-08-17T10:05:00Z' },
    ] });

    render(<MemoryRouter initialEntries={['/support']}><Routes><Route element={<ChatWorkspace />}><Route path="/support" element={<SupportChatPage />} /></Route></Routes></MemoryRouter>);
    await screen.findByText('پشتیبانی مشتری');
    fireEvent.click(within(screen.getByLabelText('شروع گفت‌وگوی پشتیبانی')).getByRole('button', { name: /پشتیبانی مشتری/ }));

    await waitFor(() => expect(screen.getByText('Agent One')).toBeTruthy());
    expect(screen.getByText('شما')).toBeTruthy();
    expect(screen.getByText('سلام')).toBeTruthy();
    expect(screen.getByText('در خدمتم')).toBeTruthy();
  });
});
