// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { useChatVisibilityRefresh } from './useChatVisibilityRefresh';

const mocks = vi.hoisted(() => ({
  getConversations: vi.fn(),
  getMessages: vi.fn(),
  markRead: vi.fn(),
  refreshMessages: vi.fn(() => Promise.resolve()),
}));

vi.mock('../services/api', () => ({
  chatAPI: {
    getConversations: mocks.getConversations,
    getMessages: mocks.getMessages,
    markRead: mocks.markRead,
  },
}));

const Harness = ({ activeId = null }) => {
  useChatVisibilityRefresh({
    currentUserId: 9,
    activeId,
    setConversations: vi.fn(),
    refreshMessages: mocks.refreshMessages,
  });
  return null;
};

const fireVisibility = () => document.dispatchEvent(new Event('visibilitychange'));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useChatVisibilityRefresh', () => {
  it('delegates the active conversation refresh to refreshMessages without fetching page 1', async () => {
    mocks.getConversations.mockResolvedValue({ data: [{ id: 42, status: 'accepted' }] });
    render(<Harness activeId={42} />);

    fireVisibility();

    await waitFor(() => expect(mocks.getConversations).toHaveBeenCalled());
    await waitFor(() => expect(mocks.refreshMessages).toHaveBeenCalledWith(42));
    expect(mocks.getMessages).not.toHaveBeenCalled();
    expect(mocks.markRead).not.toHaveBeenCalled();
  });

  it('skips the message reload when the active conversation disappeared', async () => {
    mocks.getConversations.mockResolvedValue({ data: [] });
    render(<Harness activeId={42} />);

    fireVisibility();

    await waitFor(() => expect(mocks.getConversations).toHaveBeenCalled());
    expect(mocks.refreshMessages).not.toHaveBeenCalled();
  });

  it('skips the refresh while the document is hidden', async () => {
    mocks.getConversations.mockResolvedValue({ data: [{ id: 42, status: 'accepted' }] });
    render(<Harness activeId={42} />);

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    fireVisibility();
    delete document.hidden;

    expect(mocks.getConversations).not.toHaveBeenCalled();
    expect(mocks.refreshMessages).not.toHaveBeenCalled();
  });
});