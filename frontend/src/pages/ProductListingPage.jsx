import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, SlidersHorizontal, SearchX, ListFilter, PackageOpen, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/Select';
import { Slider } from '../components/ui/Slider';
import { formatPrice } from '../lib/formatPrice';
import ProductCard from '../components/ProductCard';
import ProductGridSkeleton from '../components/skeletons/ProductGridSkeleton';
import { SEO } from '../lib/seo';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import {
  serializeFilterValues,
  useProductFilterMetadata,
  useProductsQuery,
} from '../queries/productQueries';

/* ─── Collapsible Filter Section ─── */
const FilterSection = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/20 dark:border-white/10 pb-4 last:border-b-0 last:pb-0 overflow-visible">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-right"
      >
        <h3 className="font-semibold text-sm">{title}</h3>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
};

/* ─── Main Page ─── */
const ProductListingPage = () => {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const navigateToProduct = useCallback((path) => navigate(path), [navigate]);
  const location = useLocation();

  const isSalePage = location.pathname === '/sale';
  const isNewArrivalsPage = location.pathname === '/new-arrivals';
  const isTrendingPage = location.pathname === '/trending';
  const searchQuery = searchParams.get('search') || '';

  /* ── State ── */
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);

  const [filters, setFilters] = useState({
    category_slug: category || '',
    min_price: '',
    max_price: '',
    size: [],
    color: [],
    brand: [],
    fabric: [],
    min_rating: '',
  });

  const [sortOrder, setSortOrder] = useState('-created_at');
  const [priceRange, setPriceRange] = useState([0, 5000000]);

  const {
    sizes: availableSizes,
    colors: availableColors,
    brands: availableBrands,
    fabrics: availableFabrics,
    categories: allCategories,
    maxPrice,
    error: metadataError,
  } = useProductFilterMetadata();

  const priceQueryInput = useMemo(() => ({
    minPrice: filters.min_price,
    maxPrice: filters.max_price,
  }), [filters.max_price, filters.min_price]);
  const resetDebouncedPagination = useCallback(() => setPage(1), []);
  const debouncedPrice = useDebouncedValue(priceQueryInput, 400, resetDebouncedPagination);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 400, resetDebouncedPagination);

  const productParams = useMemo(() => {
    const params = { ordering: sortOrder, page };

    if (filters.category_slug) params.category_slug = filters.category_slug;
    if (debouncedPrice.minPrice) params.min_price = debouncedPrice.minPrice;
    if (debouncedPrice.maxPrice) params.max_price = debouncedPrice.maxPrice;
    if (filters.size.length > 0) params.size = serializeFilterValues(filters.size);
    if (filters.color.length > 0) params.color = serializeFilterValues(filters.color);
    if (filters.brand.length > 0) params.brand = serializeFilterValues(filters.brand);
    if (filters.fabric.length > 0) params.fabric = serializeFilterValues(filters.fabric);
    if (filters.min_rating) params.min_rating = filters.min_rating;
    if (isSalePage) params.has_discount = 'true';
    if (isNewArrivalsPage) params.is_new_arrival = 'true';
    if (isTrendingPage) params.is_trending = 'true';
    if (debouncedSearchQuery) params.search = debouncedSearchQuery;

    return params;
  }, [
    debouncedPrice.maxPrice,
    debouncedPrice.minPrice,
    debouncedSearchQuery,
    filters.brand,
    filters.category_slug,
    filters.color,
    filters.fabric,
    filters.min_rating,
    filters.size,
    isNewArrivalsPage,
    isSalePage,
    isTrendingPage,
    page,
    sortOrder,
  ]);

  const productsQuery = useProductsQuery(productParams);
  const products = productsQuery.data?.items || [];
  const totalPages = productsQuery.data?.totalPages || 0;
  const loading = productsQuery.isPending;

  /* ── Sync URL category param into filters ── */
  useEffect(() => {
    setPage(1);
    setFilters(prev => {
      if (prev.category_slug !== (category || '')) {
        return { ...prev, category_slug: category || '' };
      }
      return prev;
    });
  }, [category]);

  useEffect(() => {
    if (!filters.min_price && !filters.max_price) {
      setPriceRange([0, maxPrice]);
    }
  }, [filters.max_price, filters.min_price, maxPrice]);

  /* ── Filter helpers ── */
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const toggleArrayFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value]
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      category_slug: category || '',
      min_price: '',
      max_price: '',
      size: [],
      color: [],
      brand: [],
      fabric: [],
      min_rating: '',
    });
    setSortOrder('-created_at');
    setPriceRange([0, maxPrice]);
    setPage(1);
  };

  const handlePriceSliderChange = (value) => {
    setPriceRange(value);
    setFilters(prev => ({
      ...prev,
      min_price: value[0] || '',
      max_price: value[1] < maxPrice ? value[1] : '',
    }));
  };

  /* ── Count active filters ── */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.min_price) count++;
    if (filters.max_price) count++;
    if (filters.size.length > 0) count++;
    if (filters.color.length > 0) count++;
    if (filters.brand.length > 0) count++;
    if (filters.fabric.length > 0) count++;
    if (filters.min_rating) count++;
    if (sortOrder !== '-created_at') count++;
    return count;
  }, [filters, sortOrder]);

  const hasActiveFilters = activeFilterCount > 0;

  /* ── Clear a single filter ── */
  const clearSingleFilter = (key) => {
    if (key === 'sort') {
      setSortOrder('-created_at');
    } else if (key === 'price') {
      setPriceRange([0, maxPrice]);
      setFilters(prev => ({ ...prev, min_price: '', max_price: '' }));
    } else if (Array.isArray(filters[key])) {
      setFilters(prev => ({ ...prev, [key]: [] }));
    } else {
      setFilters(prev => ({ ...prev, [key]: '' }));
    }
    setPage(1);
  };

  /* ── Page title ── */
  const findCategoryBySlug = (cats, slug) => {
    for (const cat of cats) {
      if (cat.slug === slug) return cat;
      if (cat.children) {
        const found = findCategoryBySlug(cat.children, slug);
        if (found) return found;
      }
    }
    return null;
  };
  const matchedCat = findCategoryBySlug(allCategories, category);
  const pageTitle = searchQuery
    ? `نتایج جستجو: «${searchQuery}»`
    : isSalePage ? 'تخفیف‌ها'
    : isNewArrivalsPage ? 'جدیدترین‌ها'
    : isTrendingPage ? 'محبوب‌ترین‌ها'
    : matchedCat ? matchedCat.name
    : category || 'همه محصولات';

  return (
    <div className="container mx-auto px-4 py-8">
      <SEO
        title={
          searchQuery ? `نتیجه جستجو: ${searchQuery}`
          : isSalePage ? 'تخفیف‌ها و حراج'
          : isNewArrivalsPage ? 'جدیدترین محصولات'
          : isTrendingPage ? 'محبوب‌ترین محصولات'
          : matchedCat ? `خرید ${matchedCat.name}`
          : 'فروشگاه'
        }
        description={
          matchedCat?.description
          || `${pageTitle} - جدیدترین محصولات با بهترین قیمت در فروشگاه مد`
        }
        url={window.location.href}
      />
      {/* ── Mobile Filter Toggle ── */}
      <div className="flex items-center justify-between mb-4 md:hidden">
        <Button variant="outline" onClick={() => setFilterOpen(!filterOpen)} className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          فیلترها
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        <span className="text-sm text-muted-foreground">{products.length} محصول</span>
      </div>

      {/* ── Active filter chips (mobile + desktop) ── */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.min_price && (
            <Badge variant="secondary" className="flex items-center gap-1">
              از {formatPrice(filters.min_price)}
              <X className="h-3 w-3 cursor-pointer" onClick={() => clearSingleFilter('price')} />
            </Badge>
          )}
          {filters.max_price && (
            <Badge variant="secondary" className="flex items-center gap-1">
              تا {formatPrice(filters.max_price)}
              <X className="h-3 w-3 cursor-pointer" onClick={() => clearSingleFilter('price')} />
            </Badge>
          )}
          {filters.size.map(s => {
            const size = availableSizes.find(sz => sz.id.toString() === s);
            return (
              <Badge key={`s-${s}`} variant="secondary" className="flex items-center gap-1">
                سایز: {size?.name || s}
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggleArrayFilter('size', s)} />
              </Badge>
            );
          })}
          {filters.color.map(c => {
            const color = availableColors.find(cl => cl.id.toString() === c);
            return (
              <Badge key={`c-${c}`} variant="secondary" className="flex items-center gap-1">
                رنگ: {color?.name || c}
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggleArrayFilter('color', c)} />
              </Badge>
            );
          })}
          {filters.brand.map(b => {
            const brand = availableBrands.find(br => br.id.toString() === b);
            return (
              <Badge key={`b-${b}`} variant="secondary" className="flex items-center gap-1">
                برند: {brand?.name || b}
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggleArrayFilter('brand', b)} />
              </Badge>
            );
          })}
          {filters.fabric.map(f => {
            const fabric = availableFabrics.find(fb => fb.id.toString() === f);
            return (
              <Badge key={`f-${f}`} variant="secondary" className="flex items-center gap-1">
                جنس: {fabric?.name || f}
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggleArrayFilter('fabric', f)} />
              </Badge>
            );
          })}
          {filters.min_rating && (
            <Badge variant="secondary" className="flex items-center gap-1">
              حداقل امتیاز: {filters.min_rating}
              <X className="h-3 w-3 cursor-pointer" onClick={() => clearSingleFilter('min_rating')} />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs">
            پاک کردن همه
          </Button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* ── Filters Sidebar ── */}
        <aside className={`${filterOpen ? 'block' : 'hidden'} md:block md:w-72 shrink-0 overflow-visible`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              فیلترها
            </h2>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  پاک کردن همه
                </Button>
              )}
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setFilterOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-4 space-y-5 overflow-visible rounded-2xl bg-white/20 dark:bg-white/5 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-xl shadow-black/5">
            {/* ── Sorting ── */}
            <FilterSection title="مرتب‌سازی" defaultOpen={true}>
              <Select
                value={sortOrder}
                onValueChange={(value) => {
                  setSortOrder(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="مرتب‌سازی" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created_at">جدیدترین</SelectItem>
                  <SelectItem value="created_at">قدیمی‌ترین</SelectItem>
                  <SelectItem value="price">ارزان‌ترین</SelectItem>
                  <SelectItem value="-price">گران‌ترین</SelectItem>
                  <SelectItem value="-rating">محبوب‌ترین</SelectItem>
                  <SelectItem value="name">نام (الفبایی)</SelectItem>
                </SelectContent>
              </Select>
            </FilterSection>

            {/* ── Price Range ── */}
            <FilterSection title="محدوده قیمت" defaultOpen={true}>
              <div className="space-y-3">
                <Slider
                  min={0}
                  max={maxPrice}
                  step={Math.max(1000, Math.floor(maxPrice / 100))}
                  value={priceRange}
                  onValueChange={handlePriceSliderChange}
                  dir="rtl"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="حداقل"
                    value={filters.min_price}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, min_price: e.target.value }));
                      setPriceRange([parseInt(e.target.value) || 0, priceRange[1]]);
                    }}
                    className="text-center text-sm"
                  />
                  <span className="text-muted-foreground">—</span>
                  <Input
                    type="number"
                    placeholder="حداکثر"
                    value={filters.max_price}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, max_price: e.target.value }));
                      setPriceRange([priceRange[0], parseInt(e.target.value) || maxPrice]);
                    }}
                    className="text-center text-sm"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatPrice(priceRange[0])}</span>
                  <span>{formatPrice(priceRange[1])}</span>
                </div>
              </div>
            </FilterSection>

            {/* ── Categories ── */}
            <FilterSection title="دسته‌بندی" defaultOpen={true}>
              <div className="space-y-1">
                <button
                  onClick={() => handleFilterChange('category_slug', '')}
                  className={`block w-full text-right px-3 py-1.5 rounded-md text-sm transition-colors ${
                    filters.category_slug === ''
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  همه
                </button>
                {allCategories.map(cat => (
                  <div key={cat.id} className="relative group/cat">
                    <div className="flex items-center">
                      <button
                        onClick={() => handleFilterChange('category_slug', cat.slug)}
                        className={`flex-1 text-right px-3 py-1.5 rounded-md text-sm transition-colors ${
                          filters.category_slug === cat.slug
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {cat.name}
                      </button>
                      {cat.children && cat.children.length > 0 && (
                        <span className="px-1 text-muted-foreground">
                          <ChevronDown className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    {cat.children && cat.children.length > 0 && (
                      <div className="hidden group-hover/cat:block w-full mt-1 bg-background border rounded-xl shadow-lg py-1 z-50">
                        <button
                          onClick={() => handleFilterChange('category_slug', cat.slug)}
                          className="block w-full text-right px-4 py-1.5 text-xs font-bold text-primary hover:bg-muted transition-colors"
                        >
                          همه {cat.name}
                        </button>
                        <div className="border-t my-1" />
                        {cat.children.map(child => (
                          <button
                            key={child.id}
                            onClick={() => handleFilterChange('category_slug', child.slug)}
                            className={`block w-full text-right px-4 py-1.5 text-xs transition-colors ${
                              filters.category_slug === child.slug
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            {child.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </FilterSection>

            {/* ── Sizes ── */}
            {availableSizes.length > 0 && (
              <FilterSection title="سایز" defaultOpen={true}>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map(size => (
                    <button
                      key={size.id}
                      onClick={() => toggleArrayFilter('size', size.id.toString())}
                      className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-all ${
                        filters.size.includes(size.id.toString())
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {size.name}
                    </button>
                  ))}
                </div>
              </FilterSection>
            )}

            {/* ── Colors ── */}
            {availableColors.length > 0 && (
              <FilterSection title="رنگ" defaultOpen={true}>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map(color => (
                    <button
                      key={color.id}
                      onClick={() => toggleArrayFilter('color', color.id.toString())}
                      className={`w-9 h-9 rounded-full border-2 transition-all relative ${
                        filters.color.includes(color.id.toString())
                          ? 'border-primary ring-2 ring-primary/30 scale-110'
                          : 'border-border hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex_code }}
                      title={color.name}
                    >
                      {filters.color.includes(color.id.toString()) && (
                        <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold drop-shadow">
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {availableColors.map(color => (
                    <span
                      key={color.id}
                      onClick={() => toggleArrayFilter('color', color.id.toString())}
                      className={`text-xs px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                        filters.color.includes(color.id.toString())
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {color.name}
                    </span>
                  ))}
                </div>
              </FilterSection>
            )}

            {/* ── Brands ── */}
            {availableBrands.length > 0 && (
              <FilterSection title="برند" defaultOpen={true}>
                <div className="space-y-1.5">
                  {availableBrands.map(brand => (
                    <label
                      key={brand.id}
                      className="flex items-center gap-2.5 cursor-pointer py-1 px-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={filters.brand.includes(brand.id.toString())}
                        onChange={() => toggleArrayFilter('brand', brand.id.toString())}
                        className="w-4 h-4 rounded border-input accent-primary"
                      />
                      <span className="text-sm">{brand.name}</span>
                    </label>
                  ))}
                </div>
              </FilterSection>
            )}

            {/* ── Fabric ── */}
            {availableFabrics.length > 0 && (
              <FilterSection title="جنس پارچه" defaultOpen={false}>
                <div className="space-y-1.5">
                  {availableFabrics.map(fabric => (
                    <label
                      key={fabric.id}
                      className="flex items-center gap-2.5 cursor-pointer py-1 px-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={filters.fabric.includes(fabric.id.toString())}
                        onChange={() => toggleArrayFilter('fabric', fabric.id.toString())}
                        className="w-4 h-4 rounded border-input accent-primary"
                      />
                      <span className="text-sm">{fabric.name}</span>
                    </label>
                  ))}
                </div>
              </FilterSection>
            )}

            {/* ── Rating ── */}
            <FilterSection title="امتیاز" defaultOpen={false}>
              <div className="space-y-1">
                {[4, 3, 2, 1].map(rating => (
                  <button
                    key={rating}
                    onClick={() => handleFilterChange('min_rating', filters.min_rating === rating.toString() ? '' : rating.toString())}
                    className={`flex items-center gap-2 w-full text-right px-3 py-1.5 rounded-md text-sm transition-colors ${
                      filters.min_rating === rating.toString()
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>
                    <span className="text-xs">و بالاتر</span>
                  </button>
                ))}
              </div>
            </FilterSection>
          </div>
        </aside>

        {/* ── Products Grid ── */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl sm:text-2xl font-bold">{pageTitle}</h1>
            <div className="flex items-center gap-2">
              {productsQuery.isFetching && !loading && (
                <span className="text-xs text-muted-foreground" role="status">
                  در حال به‌روزرسانی…
                </span>
              )}
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {products.length} محصول
              </span>
            </div>
          </div>

          {loading ? (
            <ProductGridSkeleton count={8} size="large" />
          ) : productsQuery.isError ? (
            <EmptyState
              icon={AlertCircle}
              badge="خطای ارتباط"
              title="دریافت محصولات ممکن نشد"
              description="اتصال اینترنت را بررسی کنید و دوباره تلاش کنید."
              primaryLabel="تلاش دوباره"
              primaryOnClick={() => productsQuery.refetch()}
              accent="from-red-500/15 via-orange-500/10 to-amber-500/10"
            />
          ) : products.length === 0 ? (
            searchQuery ? (
              <EmptyState
                icon={SearchX}
                badge="جستجو"
                title={`محصولی با عنوان «${searchQuery}» یافت نشد`}
                description="عبارت دیگری را امتحان کنید یا فیلترها را پاک کنید تا همه محصولات را ببینید."
                primaryLabel="پاک کردن جستجو"
                primaryOnClick={() => { searchParams.delete('search'); setSearchParams(searchParams); }}
                secondaryLabel="مشاهده همه محصولات"
                secondaryTo="/products"
                accent="from-amber-500/15 via-orange-500/10 to-yellow-500/10"
              />
            ) : hasActiveFilters ? (
              <EmptyState
                icon={ListFilter}
                badge="فیلتر"
                title="محصولی با فیلترهای انتخابی یافت نشد"
                description="فیلترها را تغییر دهید یا پاک کنید تا محصولات بیشتری ببینید."
                primaryLabel="پاک کردن فیلترها"
                primaryOnClick={clearFilters}
                secondaryLabel="مشاهده همه محصولات"
                secondaryTo="/products"
                accent="from-violet-500/15 via-purple-500/10 to-fuchsia-500/10"
              />
            ) : (
              <EmptyState
                icon={PackageOpen}
                badge="محصولات"
                title="هنوز محصولی ثبت نشده"
                description="به‌زودی محصولات جدید و جذاب اضافه خواهند شد. صفحه اصلی را بررسی کنید."
                primaryLabel="بازگشت به خانه"
                primaryTo="/"
                secondaryLabel="مشاهده بلاگ"
                secondaryTo="/blog"
              />
            )
          ) : (
            <div
              className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 transition-opacity content-auto-grid ${
                productsQuery.isFetching ? 'opacity-70' : 'opacity-100'
              }`}
              aria-busy={productsQuery.isFetching}
            >
              {products.map(product => (
                <ProductCard key={product.id} product={product} size="large" onNavigate={navigateToProduct} />
              ))}
            </div>
          )}

          {metadataError && (
            <p className="mt-4 text-center text-xs text-destructive" role="status">
              بخشی از گزینه‌های فیلتر در دسترس نیست؛ برای دریافت دوباره صفحه را تازه کنید.
            </p>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-sm font-bold transition-all hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-muted-foreground/50">...</span>
                    )}
                    <button
                      onClick={() => setPage(p)}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition-all ${
                        p === page
                          ? 'bg-neutral-900 text-white shadow-md dark:bg-white dark:text-neutral-900'
                          : 'border border-border/60 bg-background/60 hover:bg-muted'
                      }`}
                    >
                      {p.toLocaleString('fa-IR')}
                    </button>
                  </React.Fragment>
                ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-sm font-bold transition-all hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductListingPage;
