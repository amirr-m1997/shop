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
});
