// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChatModeNavigation from './ChatModeNavigation';

afterEach(() => cleanup());

describe('ChatModeNavigation', () => {
  it('links private chat and style rooms from the Chat shell', () => {
    render(<MemoryRouter initialEntries={['/chat']}><ChatModeNavigation /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Private chat' }).getAttribute('href')).toBe('/chat');
    expect(screen.getByRole('link', { name: 'Style Rooms' }).getAttribute('href')).toBe('/style-rooms');
  });

  it('keeps Style Rooms active for a room detail route', () => {
    render(<MemoryRouter initialEntries={['/style-rooms/room-1']}><ChatModeNavigation /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Style Rooms' }).className).toContain('text-amber-700');
    expect(screen.getByRole('link', { name: 'Private chat' }).className).not.toContain('text-amber-700');
  });

  it('only exposes the staff inbox to support roles', () => {
    const { rerender } = render(<MemoryRouter initialEntries={['/chat']}><ChatModeNavigation user={{ role: 'user' }} /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: 'Support Inbox' })).toBeNull();
    rerender(<MemoryRouter initialEntries={['/chat']}><ChatModeNavigation user={{ role: 'support_agent' }} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Support Inbox' }).getAttribute('href')).toBe('/support/inbox');
  });

  it('uses a stable desktop width while staying full width on mobile', () => {
    const { container } = render(<MemoryRouter initialEntries={['/chat']}><ChatModeNavigation className="w-full md:w-[360px]" /></MemoryRouter>);
    const navigation = container.querySelector('nav');
    expect(navigation.parentElement).toBeTruthy();
    expect(navigation.className).toContain('w-full');
    expect(navigation.className).toContain('md:w-[360px]');
    expect(navigation.className).toContain('flex-nowrap');
  });
});
