// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddItemDialog from './AddItemDialog';
import { productsAPI } from '../../services/api';

vi.mock('../../services/api', () => ({
  productsAPI: { getProducts: vi.fn() },
}));

vi.mock('../../queries/styleRoomQueries', () => ({
  useAddStyleRoomItem: () => ({ mutate: vi.fn(), isPending: false }),
}));

const toast = vi.fn();
vi.mock('../ui/use-toast', () => ({
  useToast: () => ({ toast }),
}));

const PRODUCTS = [
  { id: 1, name: 'کت پاییزی', price: '1200000', primary_image: null },
  { id: 2, name: 'شلوار جین', price: '800000', primary_image: null },
];

/** Controlled mutation stub: keeps callbacks so each test can settle it. */
const createAddItemStub = (overrides = {}) => {
  const callbacks = {};
  const addItem = {
    isPending: false,
    mutate: vi.fn((_productId, opts) => Object.assign(callbacks, opts)),
    ...overrides,
  };
  return { addItem, callbacks };
};

const renderDialog = (props = {}) => {
  const merged = {
    open: true,
    onOpenChange: vi.fn(),
    roomId: '11111111-2222-3333-4444-555555555555',
    ...props,
  };
  return render(<AddItemDialog {...merged} />);
};

describe('AddItemDialog add-product state handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productsAPI.getProducts.mockReset();
    productsAPI.getProducts.mockResolvedValue({ data: { results: PRODUCTS } });
  });

  it('posts exactly one add request even on a rapid double click', async () => {
    const { addItem } = createAddItemStub();
    renderDialog({ addItem });

    const row = await screen.findByRole('button', { name: /کت پاییزی/ });
    fireEvent.click(row);
    fireEvent.click(row);

    expect(addItem.mutate).toHaveBeenCalledTimes(1);
    expect(addItem.mutate).toHaveBeenCalledWith(1, expect.any(Object));
  });

  it('resets the pending state and closes the dialog after a successful add', async () => {
    const { addItem, callbacks } = createAddItemStub();
    const onOpenChange = vi.fn();
    renderDialog({ addItem, onOpenChange });

    const row = await screen.findByRole('button', { name: /کت پاییزی/ });
    fireEvent.click(row);
    expect(addItem.mutate).toHaveBeenCalledTimes(1);

    callbacks.onSuccess?.();
    callbacks.onSettled?.();

    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => {
      expect(row.disabled).toBe(false);
    });
  });

  it('keeps the dialog open, reports a 400 duplicate error, and resets the pending spinner', async () => {
    const { addItem, callbacks } = createAddItemStub();
    const onOpenChange = vi.fn();
    renderDialog({ addItem, onOpenChange });

    const row = await screen.findByRole('button', { name: /کت پاییزی/ });
    fireEvent.click(row);
    expect(addItem.mutate).toHaveBeenCalledTimes(1);

    const err = { response: { status: 400, data: { error: 'این محصول قبلاً در اتاق وجود دارد.' } } };
    callbacks.onError?.(err);
    callbacks.onSettled?.();

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', description: 'این محصول قبلاً در اتاق وجود دارد.' })
    );
    await waitFor(() => {
      expect(row.disabled).toBe(false);
    });
  });

  it('keeps the dialog open, reports a 403 error, and resets the pending spinner', async () => {
    const { addItem, callbacks } = createAddItemStub();
    const onOpenChange = vi.fn();
    renderDialog({ addItem, onOpenChange });

    const row = await screen.findByRole('button', { name: /کت پاییزی/ });
    fireEvent.click(row);
    expect(addItem.mutate).toHaveBeenCalledTimes(1);

    const err = { response: { status: 403, data: { detail: 'دسترسی ندارید.' } } };
    callbacks.onError?.(err);
    callbacks.onSettled?.();

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', description: 'دسترسی ندارید.' })
    );
    await waitFor(() => {
      expect(row.disabled).toBe(false);
    });
  });

  it('keeps the dialog open, reports a network failure, and resets the pending spinner', async () => {
    const { addItem, callbacks } = createAddItemStub();
    const onOpenChange = vi.fn();
    renderDialog({ addItem, onOpenChange });

    const row = await screen.findByRole('button', { name: /کت پاییزی/ });
    fireEvent.click(row);
    expect(addItem.mutate).toHaveBeenCalledTimes(1);

    callbacks.onError?.(new Error('Network Error'));
    callbacks.onSettled?.();

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', description: 'افزودن محصول ممکن نشد.' })
    );
    await waitFor(() => {
      expect(row.disabled).toBe(false);
    });
  });

  it('shows a per-row spinner only while that product is being added', async () => {
    const { addItem, callbacks } = createAddItemStub();
    renderDialog({ addItem });

    const row = await screen.findByRole('button', { name: /کت پاییزی/ });
    fireEvent.click(row);

    expect(row.querySelector('.animate-spin')).toBeTruthy();
    callbacks.onSettled?.();
    await waitFor(() => {
      expect(row.querySelector('.animate-spin')).toBeNull();
    });
  });
});
