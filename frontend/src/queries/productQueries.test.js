import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productsAPI } from '../services/api';
import {
  fetchProductList,
  fetchProductDetail,
  productKeys,
  serializeFilterValues,
  shouldKeepPreviousProducts,
} from './productQueries';

vi.mock('../services/api', () => ({
  productsAPI: {
    getProducts: vi.fn(),
    getProduct: vi.fn(),
  },
}));

describe('product queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates stable, scoped keys for product lists', () => {
    const params = { ordering: '-created_at', page: 2, color: '3,4' };
    expect(productKeys.list(params)).toEqual([
      'products',
      'list',
      { color: '3,4', ordering: '-created_at', page: 2 },
    ]);
    expect(productKeys.list({ page: 2, color: '3,4', ordering: '-created_at' }))
      .toEqual(productKeys.list(params));
  });

  it('canonicalizes multi-select filter values regardless of selection order', () => {
    expect(serializeFilterValues(['10', '2', '1'])).toBe('1,2,10');
    expect(serializeFilterValues(['2', '10', '1'])).toBe('1,2,10');
  });

  it('passes the cancellation signal to the API and normalizes pagination', async () => {
    const controller = new AbortController();
    const params = { ordering: '-created_at', page: 2 };
    productsAPI.getProducts.mockResolvedValue({
      data: {
        count: 125,
        next: null,
        previous: '/api/products/products/?page=1',
        results: Array.from({ length: 25 }, (_, id) => ({ id })),
      },
    });

    const result = await fetchProductList({
      queryKey: productKeys.list(params),
      signal: controller.signal,
    });

    expect(productsAPI.getProducts).toHaveBeenCalledWith(params, { signal: controller.signal });
    expect(result).toMatchObject({ count: 125, totalPages: 2 });
    expect(result.items).toHaveLength(25);
  });

  it('uses a reusable detail key and forwards cancellation to the detail API', async () => {
    const controller = new AbortController();
    productsAPI.getProduct.mockResolvedValue({ data: { id: 12, slug: 'test-product' } });

    const result = await fetchProductDetail({
      queryKey: productKeys.detail('test-product'),
      signal: controller.signal,
    });

    expect(productKeys.detail('test-product')).toEqual(['products', 'detail', 'test-product']);
    expect(productsAPI.getProduct).toHaveBeenCalledWith('test-product', { signal: controller.signal });
    expect(result).toEqual({ id: 12, slug: 'test-product' });
  });

  it('keeps previous products for pagination but not for filter changes', () => {
    const firstPage = { ordering: '-created_at', color: '3,4', page: 1 };

    expect(shouldKeepPreviousProducts(firstPage, { ...firstPage, page: 2 })).toBe(true);
    expect(shouldKeepPreviousProducts(firstPage, { ...firstPage, color: '5', page: 1 })).toBe(false);
    expect(shouldKeepPreviousProducts(firstPage, { ...firstPage, ordering: 'price', page: 1 })).toBe(false);
  });
});
