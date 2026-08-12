import { useQueries, useQuery } from '@tanstack/react-query';
import { productsAPI } from '../services/api';

const STATIC_DATA_STALE_TIME = 30 * 60_000;
const STATIC_DATA_GC_TIME = 60 * 60_000;

const unwrapList = (response) => response.data.results || response.data || [];

export const serializeFilterValues = (values) => [...values]
  .sort((first, second) => String(first).localeCompare(String(second), 'en', { numeric: true }))
  .join(',');

export const normalizeProductParams = (params) => Object.fromEntries(
  Object.entries(params)
    .filter(([, value]) => value !== '' && value !== undefined && value !== null)
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
);

export const productKeys = {
  all: ['products'],
  lists: () => [...productKeys.all, 'list'],
  list: (params) => [...productKeys.lists(), normalizeProductParams(params)],
  details: () => [...productKeys.all, 'detail'],
  detail: (slug) => [...productKeys.details(), slug],
  metadata: () => [...productKeys.all, 'metadata'],
  metadataItem: (name) => [...productKeys.metadata(), name],
};

export const PRODUCT_DETAIL_STALE_TIME = 5 * 60_000;
export const PRODUCT_DETAIL_GC_TIME = 30 * 60_000;

export const fetchProductDetail = async ({ queryKey, signal }) => {
  const [, , slug] = queryKey;
  const response = await productsAPI.getProduct(slug, { signal });
  return response.data;
};

export const productDetailQueryOptions = (slug) => ({
  queryKey: productKeys.detail(slug),
  queryFn: fetchProductDetail,
  enabled: Boolean(slug),
  staleTime: PRODUCT_DETAIL_STALE_TIME,
  gcTime: PRODUCT_DETAIL_GC_TIME,
});

export const useProductDetailQuery = (slug) => useQuery(productDetailQueryOptions(slug));

export const fetchProductList = async ({ queryKey, signal }) => {
  const [, , params] = queryKey;
  const response = await productsAPI.getProducts(params, { signal });
  const items = response.data.results || response.data || [];
  const count = response.data.count ?? items.length;
  const currentPage = Number(params.page) || 1;
  const inferredLastPageSize = currentPage > 1
    ? Math.ceil((count - items.length) / (currentPage - 1))
    : items.length;
  const pageSize = response.data.page_size
    || (response.data.next ? items.length : inferredLastPageSize)
    || 1;

  return {
    items,
    count,
    totalPages: response.data.total_pages ?? Math.ceil(count / pageSize),
  };
};

export const shouldKeepPreviousProducts = (previousParams, nextParams) => {
  if (!previousParams || !nextParams) return false;
  const { page: _previousPage, ...previousScope } = normalizeProductParams(previousParams);
  const { page: _nextPage, ...nextScope } = normalizeProductParams(nextParams);
  return JSON.stringify(previousScope) === JSON.stringify(nextScope);
};

export const useProductsQuery = (params) => useQuery({
  queryKey: productKeys.list(params),
  queryFn: fetchProductList,
  // Keep the grid stable only while paginating within the same result set.
  // A filter/search/sort change should not display unrelated old products.
  placeholderData: (previousData, previousQuery) => (
    shouldKeepPreviousProducts(previousQuery?.queryKey?.[2], params)
      ? previousData
      : undefined
  ),
});

const metadataQueries = [
  ['sizes', ({ signal }) => productsAPI.getSizes({ signal }).then(unwrapList)],
  ['colors', ({ signal }) => productsAPI.getColors({ signal }).then(unwrapList)],
  ['brands', ({ signal }) => productsAPI.getBrands({ signal }).then(unwrapList)],
  ['fabrics', ({ signal }) => productsAPI.getFabrics({ signal }).then(unwrapList)],
  ['categories', ({ signal }) => productsAPI.getCategories({ signal }).then(unwrapList)],
  ['maxPrice', ({ signal }) => productsAPI.getMaxPrice({ signal }).then((response) => (
    response.data?.max_price || 5_000_000
  ))],
];

const metadataQueryOptions = ([name, queryFn]) => ({
  queryKey: productKeys.metadataItem(name),
  queryFn,
  staleTime: STATIC_DATA_STALE_TIME,
  gcTime: STATIC_DATA_GC_TIME,
});

export const useProductCategories = () => useQuery({
  ...metadataQueryOptions(metadataQueries.find(([name]) => name === 'categories')),
  select: (categories) => categories.filter((category) => !category.parent),
});

export const useProductFilterMetadata = () => {
  const queries = useQueries({
    queries: metadataQueries.map(metadataQueryOptions),
  });

  const [sizes, colors, brands, fabrics, categories, maxPrice] = queries.map((query) => query.data);

  return {
    sizes: sizes || [],
    colors: colors || [],
    brands: brands || [],
    fabrics: fabrics || [],
    categories: (categories || []).filter((category) => !category.parent),
    maxPrice: maxPrice || 5_000_000,
    isLoading: queries.some((query) => query.isPending),
    error: queries.find((query) => query.error)?.error || null,
  };
};
