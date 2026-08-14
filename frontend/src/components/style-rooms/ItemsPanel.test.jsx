// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ItemsPanel from './ItemsPanel';

vi.mock('../../queries/styleRoomQueries', () => ({
  useAddStyleRoomItem: () => ({ isPending: false, mutate: vi.fn() }),
  useRemoveStyleRoomItem: () => ({ isPending: false, mutate: vi.fn() }),
  useStyleRoomItemsQuery: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
}));

vi.mock('../ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('../ui/Button', () => ({ Button: ({ children, ...props }) => <button {...props}>{children}</button> }));
vi.mock('../ui/EmptyState', () => ({ default: ({ children, title }) => <section><p>{title}</p>{children}</section> }));
vi.mock('./AddItemDialog', () => ({ default: ({ open }) => open ? <div role="dialog">افزودن محصول به اتاق</div> : null }));
vi.mock('./RoomItemCard', () => ({ default: () => null }));
vi.mock('./ConfirmDialog', () => ({ default: () => null }));

describe('ItemsPanel empty state', () => {
  it('opens the product dialog when the add-product button is clicked', () => {
    render(<ItemsPanel roomId="room-1" room={{ my_role: 'owner' }} currentUserId="user-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'افزودن محصول' }));

    expect(screen.getByRole('dialog').textContent).toContain('افزودن محصول به اتاق');
  });
});
