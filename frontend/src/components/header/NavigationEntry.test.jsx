// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DesktopHeader from './DesktopHeader';
import MobileBottomNav from './MobileBottomNav';

afterEach(() => cleanup());

const desktopProps = {
  scrolled: false,
  isChat: false,
  searchQuery: '',
  onSearchChange: () => {},
  onSearchSubmit: () => {},
  searchInputRef: { current: null },
  navCategories: [],
  cartCount: 0,
  wishlistCount: 0,
  unreadChat: 0,
  isAuthenticated: true,
  userFullName: 'کاربر',
  theme: 'light',
  toggleTheme: () => {},
  onCartOpen: () => {},
  onLogout: () => {},
};

describe('main navigation', () => {
  it('does not expose Style Rooms in the desktop main navigation', () => {
    render(<MemoryRouter><DesktopHeader {...desktopProps} /></MemoryRouter>);
    expect(screen.queryAllByRole('link', { name: 'اتاق‌های استایل' })).toHaveLength(0);
  });

  it('does not expose Style Rooms in the mobile bottom navigation', () => {
    render(<MemoryRouter><MobileBottomNav isAuthenticated /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: 'اتاق' })).toBeNull();
  });
});
