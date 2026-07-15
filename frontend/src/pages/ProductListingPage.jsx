import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Filter } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { productsAPI } from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';

const ProductListingPage = () => {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const isSalePage = location.pathname === '/sale';
  const isNewArrivalsPage = location.pathname === '/new-arrivals';
  const isTrendingPage = location.pathname === '/trending';

  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({
    main_category: category || '',
    min_price: '',
    max_price: '',
    size: [],
    color: [],
    brand: [],
  });

  const [loading, setLoading] = useState(true);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableBrands, setAvailableBrands] = useState([]);

  useEffect(() => {
    // Load filter options from API
    const loadFilterOptions = async () => {
      try {
        const [sizesRes, colorsRes, brandsRes] = await Promise.all([
          productsAPI.getSizes(),
          productsAPI.getColors(),
          productsAPI.getBrands(),
        ]);

        setAvailableSizes(sizesRes.data || []);
        setAvailableColors(colorsRes.data || []);
        setAvailableBrands(brandsRes.data || []);
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };

    loadFilterOptions();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = {};

        if (filters.main_category) params.main_category = filters.main_category;
        if (filters.min_price) params.price__gte = filters.min_price;
        if (filters.max_price) params.price__lte = filters.max_price;
        if (filters.size.length > 0) params.size = filters.size.join(',');
        if (filters.color.length > 0) params.color = filters.color.join(',');
        if (filters.brand.length > 0) params.brand__id__in = filters.brand.join(',');

        if (isSalePage) params.compare_price__isnull = 'false';
        if (isNewArrivalsPage) params.is_new_arrival = 'true';
        if (isTrendingPage) params.is_trending = 'true';

        const response = await productsAPI.getProducts(params);
        setProducts(response.data.results || response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [category, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value]
    }));
  };

  const clearFilters = () => {
    setFilters({
      main_category: category || '',
      min_price: '',
      max_price: '',
      size: [],
      color: [],
      brand: [],
    });
  };

  const ProductCard = ({ product }) => {
    const imageUrl = product.primary_image || product.images?.[0]?.image || 'https://via.placeholder.com/400x500?text=No+Image';

    return (
      <Card
        className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg"
        onClick={() => navigate(`/product/${product.id}`)}
      >
        <CardContent className="p-0">
          <div className="relative aspect-[3/4] overflow-hidden bg-muted">
            <img
              src={imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/400x500?text=No+Image';
              }}
            />
            {product.discount_percentage > 0 && (
              <Badge className="absolute left-2 top-2 bg-destructive">
                -{product.discount_percentage}%
              </Badge>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold truncate">{product.name}</h3>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-bold">${product.price}</span>
              {product.compare_price && (
                <span className="text-sm text-muted-foreground line-through">
                  ${product.compare_price}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="md:w-64 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">فیلترها</h2>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              پاک کردن همه
            </Button>
          </div>

          <Card className="p-4 space-y-6">
            {/* Price Range */}
            <div>
              <h3 className="font-semibold mb-3">محدوده قیمت</h3>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="حداقل"
                  value={filters.min_price}
                  onChange={(e) => handleFilterChange('min_price', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="حداکثر"
                  value={filters.max_price}
                  onChange={(e) => handleFilterChange('max_price', e.target.value)}
                />
              </div>
            </div>

            {/* Sizes - Dynamic from API */}
            {availableSizes.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">سایز</h3>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map(size => (
                    <Button
                      key={size.id}
                      variant={filters.size.includes(size.id.toString()) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleArrayFilter('size', size.id.toString())}
                    >
                      {size.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Colors - Dynamic from API */}
            {availableColors.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">رنگ</h3>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map(color => (
                    <button
                      key={color.id}
                      onClick={() => toggleArrayFilter('color', color.id.toString())}
                      className={`w-8 h-8 rounded-full border-2 ${
                        filters.color.includes(color.id.toString()) ? 'border-primary' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color.hex_code }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Brands - Dynamic from API */}
            {availableBrands.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">برند</h3>
                <div className="space-y-2">
                  {availableBrands.map(brand => (
                    <label key={brand.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.brand.includes(brand.id.toString())}
                        onChange={() => toggleArrayFilter('brand', brand.id.toString())}
                        className="rounded"
                      />
                      <span>{brand.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold capitalize">
              {isSalePage ? 'تخفیف‌ها' :
               isNewArrivalsPage ? 'جدیدترین‌ها' :
               isTrendingPage ? 'محبوب‌ترین‌ها' :
               category ?
                category === 'men' ? 'مردانه' :
                category === 'women' ? 'زنانه' :
                category === 'kids' ? 'بچگانه' : 'همه محصولات'
                : 'همه محصولات'}
            </h1>
            <span className="text-muted-foreground">
              {products.length} محصول
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12">در حال بارگذاری...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              محصولی یافت نشد
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductListingPage;