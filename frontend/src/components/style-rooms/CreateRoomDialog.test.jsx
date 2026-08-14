// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import CreateRoomDialog from './CreateRoomDialog';

const createMutate = vi.fn();

vi.mock('../../queries/styleRoomQueries', () => ({
  useCreateStyleRoom: () => ({ mutate: createMutate, isPending: false }),
}));

vi.mock('../ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

afterEach(() => cleanup());
beforeEach(() => createMutate.mockClear());

const renderDialog = () =>
  render(<CreateRoomDialog open onOpenChange={() => {}} onCreated={() => {}} />);

describe('CreateRoomDialog cover removal', () => {
  it('exposes no cover upload field and no file picker', () => {
    renderDialog();
    expect(screen.queryByText('کاور (اختیاری)')).toBeNull();
    expect(screen.queryByText('انتخاب تصویر کاور')).toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it('creates a room with a plain JSON payload (no cover file, no __filePayload)', () => {
    renderDialog();
    fireEvent.change(screen.getByPlaceholderText('مثلاً: استایل‌برد پاییز'), {
      target: { value: 'اتاق من' },
    });
    fireEvent.click(screen.getByRole('button', { name: /ساخت اتاق/ }));

    expect(createMutate).toHaveBeenCalledTimes(1);
    const payload = createMutate.mock.calls[0][0];
    expect(payload).toEqual({ title: 'اتاق من', description: '', visibility: 'private' });
    expect(payload.__filePayload).toBeUndefined();
    expect(payload.cover).toBeUndefined();
  });
});