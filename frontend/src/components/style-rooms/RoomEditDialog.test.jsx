// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import RoomEditDialog from './RoomEditDialog';

const updateMutate = vi.fn();

vi.mock('../../queries/styleRoomQueries', () => ({
  useUpdateStyleRoom: () => ({ mutate: updateMutate, isPending: false }),
}));

vi.mock('../ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

afterEach(() => cleanup());
beforeEach(() => updateMutate.mockClear());

const room = { id: 'r1', title: 'قدیمی', description: 'توضیح', visibility: 'private' };

const renderDialog = () =>
  render(<RoomEditDialog open onOpenChange={() => {}} room={room} />);

describe('RoomEditDialog cover removal', () => {
  it('exposes no cover upload field and no file picker', () => {
    renderDialog();
    expect(screen.queryByText('کاور (اختیاری)')).toBeNull();
    expect(screen.queryByText('انتخاب تصویر کاور')).toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it('saves the room with a plain JSON payload (no cover file, no __filePayload)', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /ذخیره تغییرات/ }));

    expect(updateMutate).toHaveBeenCalledTimes(1);
    const payload = updateMutate.mock.calls[0][0];
    expect(payload).toEqual({ title: 'قدیمی', description: 'توضیح', visibility: 'private' });
    expect(payload.__filePayload).toBeUndefined();
    expect(payload.cover).toBeUndefined();
  });
});