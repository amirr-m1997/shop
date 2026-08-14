// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StyleRoomDetailPage from './StyleRoomDetailPage';
import { useDeleteStyleRoom, useLeaveStyleRoom, useStyleRoomDetailQuery } from '../queries/styleRoomQueries';

vi.mock('../queries/styleRoomQueries', () => ({
  useStyleRoomDetailQuery: vi.fn(),
  useDeleteStyleRoom: vi.fn(),
  useLeaveStyleRoom: vi.fn(),
  useStyleRoomMessagesQuery: vi.fn(),
  useSendStyleRoomMessage: vi.fn(),
  useMarkStyleRoomMessagesRead: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, username: 'ali' } }),
}));

vi.mock('../components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../components/style-rooms/MembersPanel', () => ({ default: () => <div data-testid="members-panel" /> }));
vi.mock('../components/style-rooms/ItemsPanel', () => ({ default: () => <div data-testid="items-panel" /> }));
vi.mock('../components/style-rooms/ActivityPanel', () => ({ default: () => <div data-testid="activity-panel" /> }));
vi.mock('../components/style-rooms/StyleRoomConversation', () => ({ default: () => <div data-testid="room-conversation" /> }));
vi.mock('../components/style-rooms/RoomActionsMenu', () => ({ default: () => <div data-testid="room-actions" /> }));
vi.mock('../components/style-rooms/JoinRoomPrompt', () => ({
  default: ({ roomId, initialToken }) => (
    <div data-testid="invite-prompt" data-room={roomId} data-token={initialToken} />
  ),
}));
vi.mock('../components/style-rooms/StyleRoomCard', () => ({
  RoomMetaChip: () => <span data-testid="meta-chip" />,
  RoomRoleBadge: () => <span data-testid="role-badge" />,
  RoomVisibilityBadge: () => <span data-testid="visibility-badge" />,
}));
vi.mock('../components/chat/ChatDomainComponents', () => ({
  Avatar: () => <span data-testid="avatar" />,
}));
vi.mock('../lib/formatDate', () => ({ formatDateShort: () => '۱۴۰۵' }));

const ROOM = {
  id: 'room-1',
  title: 'اتاق تست',
  description: '',
  my_role: 'member',
  member_count: 1,
  item_count: 0,
  cover: '',
  created_at: '2026-01-01T00:00:00Z',
  owner: { display_name: 'علی', username: 'ali' },
};

const renderPage = (detailMock, entry) => {
  useStyleRoomDetailQuery.mockReturnValue(detailMock);
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/style-rooms/:roomId" element={<StyleRoomDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
};

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  useLeaveStyleRoom.mockReturnValue({
    mutate: vi.fn((_input, hooks) => hooks?.onSuccess?.({ data: {} })),
    isPending: false,
  });
  useDeleteStyleRoom.mockReturnValue({ mutate: vi.fn(), isPending: false });
});

describe('StyleRoomDetailPage bug regressions', () => {
  it('fires exactly one leave request from the header leave button', () => {
    renderPage(
      { data: ROOM, isLoading: false, isError: false, error: null, refetch: vi.fn() },
      '/style-rooms/room-1'
    );
    fireEvent.click(screen.getByRole('button', { name: 'ترک اتاق' }));
    const { mutate: leaveMutate } = useLeaveStyleRoom();
    expect(leaveMutate).toHaveBeenCalledTimes(1);
  });

  it('shows the no-access screen on 404 when no invite token is present', () => {
    renderPage(
      { data: null, isLoading: false, isError: true, error: { response: { status: 404 } }, refetch: vi.fn() },
      '/style-rooms/room-1'
    );
    expect(screen.getByText('دسترسی به این اتاق ندارید')).toBeTruthy();
    expect(screen.queryByTestId('invite-prompt')).toBeNull();
  });

  it('shows the join prompt on 404 with an invite token', () => {
    renderPage(
      { data: null, isLoading: false, isError: true, error: { response: { status: 404 } }, refetch: vi.fn() },
      '/style-rooms/room-1?invite=TOKEN123'
    );
    const prompt = screen.getByTestId('invite-prompt');
    expect(prompt).toBeTruthy();
    expect(prompt.dataset.token).toBe('TOKEN123');
    expect(prompt.dataset.room).toBe('room-1');
  });

  it('keeps the generic error state for non-404 failures', () => {
    renderPage(
      { data: null, isLoading: false, isError: true, error: { response: { status: 500 } }, refetch: vi.fn() },
      '/style-rooms/room-1'
    );
    expect(screen.getByText('خطا در بارگذاری اتاق')).toBeTruthy();
    expect(screen.queryByTestId('invite-prompt')).toBeNull();
  });
});
