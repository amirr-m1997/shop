// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ChatWorkspace from './ChatWorkspace';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 9, role: 'user' } }),
}));

afterEach(() => cleanup());

const modes = [
  ['/chat', 'private-content'],
  ['/style-rooms', 'rooms-content'],
  ['/style-rooms/room-1', 'room-content'],
  ['/support', 'support-content'],
  ['/support/inbox', 'inbox-content'],
];

describe('ChatWorkspace', () => {
  it.each(modes)('renders the same shell for %s', (path, content) => {
    render(<MemoryRouter initialEntries={[path]}><Routes><Route element={<ChatWorkspace />}><Route path="/chat" element={<div data-testid="private-content" />} /><Route path="/style-rooms" element={<div data-testid="rooms-content" />} /><Route path="/style-rooms/:roomId" element={<div data-testid="room-content" />} /><Route path="/support" element={<div data-testid="support-content" />} /><Route path="/support/inbox" element={<div data-testid="inbox-content" />} /></Route></Routes></MemoryRouter>);
    expect(screen.getByTestId('chat-workspace')).toBeTruthy();
    expect(screen.getByTestId(content)).toBeTruthy();
    const navigationBar = screen.getByTestId('chat-mode-navigation-bar');
    const contentShell = screen.getByTestId('chat-mode-content');
    expect(Boolean(navigationBar.compareDocumentPosition(contentShell) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    const navigation = screen.getByRole('navigation', { name: 'Chat modes' });
    expect(navigation.className).toContain('md:w-[360px]');
    expect(navigation).toBeTruthy();
    expect(screen.getAllByRole('navigation', { name: 'Chat modes' })).toHaveLength(1);
    expect(Boolean(navigation.compareDocumentPosition(screen.getByTestId(content)) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

});
