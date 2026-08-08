from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from decimal import Decimal

from shop.tests import (
    UserFactory, UserProfileFactory, CategoryFactory, BrandFactory, ProductFactory,
    ProductVariantFactory, SizeFactory, ColorFactory, FabricFactory,
    ReviewFactory, WishlistFactory, create_user_with_token, create_product_with_variant,
)
from products.models import Product, Category, Review, Wishlist, HomepageSection, Banner, StyleLook


# ─── Product List & Detail ──────────────────────────────────

class ProductListTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/products/'

    def test_empty_list_returns_empty(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)

    def test_only_active_products_returned(self):
        active = ProductFactory(is_active=True)
        ProductFactory(is_active=False)
        response = self.client.get(self.url)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], active.id)

    def test_pagination_returns_page_size(self):
        ProductFactory.create_batch(5, is_active=True)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 5)
        self.assertIn('results', response.data)

    def test_product_list_uses_list_serializer(self):
        ProductFactory(is_active=True, price=Decimal('150000'))
        response = self.client.get(self.url)
        product = response.data['results'][0]
        self.assertIn('primary_image', product)
        self.assertIn('category_name', product)
        self.assertIn('discount_percentage', product)
        self.assertNotIn('description', product)

    def test_inactive_product_not_in_list(self):
        ProductFactory(is_active=False, name='Hidden Product')
        response = self.client.get(self.url)
        self.assertEqual(response.data['count'], 0)


class ProductDetailTest(APITestCase):
    def setUp(self):
        self.product = ProductFactory(
            is_active=True,
            name='Blue T-Shirt',
            slug='blue-t-shirt',
            price=Decimal('199000'),
        )
        self.url = f'/api/products/products/{self.product.slug}/'

    def test_detail_by_slug(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Blue T-Shirt')
        self.assertEqual(response.data['slug'], 'blue-t-shirt')

    def test_detail_404_for_nonexistent_slug(self):
        response = self.client.get('/api/products/products/nonexistent-slug/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_detail_404_for_inactive_product(self):
        product = ProductFactory(is_active=False, slug='inactive-prod')
        response = self.client.get(f'/api/products/products/{product.slug}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_detail_uses_detail_serializer(self):
        response = self.client.get(self.url)
        self.assertIn('description', response.data)
        self.assertIn('variants', response.data)
        self.assertIn('images', response.data)
        self.assertIn('available_sizes', response.data)
        self.assertIn('available_colors', response.data)


# ─── Filtering ──────────────────────────────────────────────

class ProductFilterByCategoryTest(APITestCase):
    def setUp(self):
        self.cat = CategoryFactory(name='Men', slug='men')
        self.other_cat = CategoryFactory(name='Women', slug='women')
        self.product_in_cat = ProductFactory(category=self.cat, is_active=True)
        self.product_in_other = ProductFactory(category=self.other_cat, is_active=True)
        self.url = '/api/products/products/'

    def test_filter_by_category_slug(self):
        response = self.client.get(self.url, {'category_slug': 'men'})
        ids = [p['id'] for p in response.data['results']]
        self.assertIn(self.product_in_cat.id, ids)
        self.assertNotIn(self.product_in_other.id, ids)

    def test_filter_by_category_id(self):
        response = self.client.get(self.url, {'category': self.cat.id})
        ids = [p['id'] for p in response.data['results']]
        self.assertIn(self.product_in_cat.id, ids)
        self.assertNotIn(self.product_in_other.id, ids)

    def test_filter_by_nonexistent_category_slug_returns_empty(self):
        response = self.client.get(self.url, {'category_slug': 'nonexistent'})
        self.assertEqual(response.data['count'], 0)

    def test_category_slug_includes_subcategories(self):
        sub = CategoryFactory(name='T-Shirts', slug='t-shirts', parent=self.cat)
        sub_product = ProductFactory(category=sub, is_active=True)
        ProductFactory(category=self.other_cat, is_active=True)
        response = self.client.get(self.url, {'category_slug': 'men'})
        ids = [p['id'] for p in response.data['results']]
        self.assertIn(self.product_in_cat.id, ids)
        self.assertIn(sub_product.id, ids)


class ProductFilterByBrandTest(APITestCase):
    def setUp(self):
        self.brand = BrandFactory(slug='nike')
        self.other_brand = BrandFactory(slug='adidas')
        self.product = ProductFactory(brand=self.brand, is_active=True)
        ProductFactory(brand=self.other_brand, is_active=True)
        self.url = '/api/products/products/'

    def test_filter_by_brand(self):
        response = self.client.get(self.url, {'brand': self.brand.id})
        ids = [p['id'] for p in response.data['results']]
        self.assertIn(self.product.id, ids)
        self.assertEqual(len(ids), 1)


class ProductFilterByPriceTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/products/'
        self.cheap = ProductFactory(price=Decimal('50000'), is_active=True)
        self.mid = ProductFactory(price=Decimal('150000'), is_active=True)
        self.expensive = ProductFactory(price=Decimal('300000'), is_active=True)

    def test_min_price_filter(self):
        response = self.client.get(self.url, {'min_price': 100000})
        ids = [p['id'] for p in response.data['results']]
        self.assertIn(self.mid.id, ids)
        self.assertIn(self.expensive.id, ids)
        self.assertNotIn(self.cheap.id, ids)

    def test_max_price_filter(self):
        response = self.client.get(self.url, {'max_price': 100000})
        ids = [p['id'] for p in response.data['results']]
        self.assertIn(self.cheap.id, ids)
        self.assertNotIn(self.mid.id, ids)
        self.assertNotIn(self.expensive.id, ids)

    def test_price_range_filter(self):
        response = self.client.get(self.url, {'min_price': 100000, 'max_price': 200000})
        ids = [p['id'] for p in response.data['results']]
        self.assertIn(self.mid.id, ids)
        self.assertNotIn(self.cheap.id, ids)
        self.assertNotIn(self.expensive.id, ids)


class ProductFilterBySizeColorTest(APITestCase):
    def setUp(self):
        self.product, self.variant = create_product_with_variant(is_active=True)
        self.other_product = ProductFactory(is_active=True)
        self.url = '/api/products/products/'

    def test_filter_by_size(self):
        size_id = self.variant.size.id
        response = self.client.get(self.url, {'size': str(size_id)})
        ids = [p['id'] for p in response.data['results']]
        self.assertIn(self.product.id, ids)
        self.assertNotIn(self.other_product.id, ids)

    def test_filter_by_color(self):
        color_id = self.variant.color.id
        response = self.client.get(self.url, {'color': str(color_id)})
        ids = [p['id'] for p in response.data['results']]
        self.assertIn(self.product.id, ids)
        self.assertNotIn(self.other_product.id, ids)


class ProductFilterByDiscountTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/products/'
        self.discounted = ProductFactory(
            price=Decimal('100000'),
            compare_price=Decimal('200000'),
            is_active=True,
        )
        self.regular = ProductFactory(
            price=Decimal('100000'),
            compare_price=None,
            is_active=True,
        )

    def test_filter_has_discount_true(self):
        response = self.client.get(self.url, {'has_discount': 'true'})
        ids = [p['id'] for p in response.data['results']]
        self.assertIn(self.discounted.id, ids)
        self.assertNotIn(self.regular.id, ids)


class ProductFilterFeaturedTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/products/'
        self.featured = ProductFactory(is_featured=True, is_active=True)
        ProductFactory(is_featured=False, is_active=True)

    def test_filter_featured(self):
        response = self.client.get(self.url, {'is_featured': 'true'})
        ids = [p['id'] for p in response.data['results']]
        self.assertIn(self.featured.id, ids)
        self.assertEqual(len(ids), 1)


class ProductFilterInStockTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/products/'
        self.in_stock = ProductFactory(stock=10, is_active=True)
        self.out_of_stock = ProductFactory(stock=0, is_active=True)

    def test_filter_in_stock(self):
        response = self.client.get(self.url, {'in_stock': 'true'})
        ids = [p['id'] for p in response.data['results']]
        self.assertIn(self.in_stock.id, ids)
        self.assertNotIn(self.out_of_stock.id, ids)

    def test_filter_out_of_stock(self):
        response = self.client.get(self.url, {'in_stock': 'false'})
        ids = [p['id'] for p in response.data['results']]
        self.assertIn(self.out_of_stock.id, ids)
        self.assertNotIn(self.in_stock.id, ids)


# ─── Search ─────────────────────────────────────────────────

class ProductSearchTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/products/'
        ProductFactory(name='Blue Cotton T-Shirt', is_active=True)
        ProductFactory(name='Red Silk Dress', is_active=True)
        ProductFactory(name='Green Wool Sweater', is_active=True)

    def test_search_by_name(self):
        response = self.client.get(self.url, {'search': 'Blue'})
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['name'], 'Blue Cotton T-Shirt')

    def test_search_partial_match(self):
        response = self.client.get(self.url, {'search': 'Silk'})
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['name'], 'Red Silk Dress')

    def test_search_no_match(self):
        response = self.client.get(self.url, {'search': 'Leather'})
        self.assertEqual(response.data['count'], 0)


# ─── Ordering ───────────────────────────────────────────────

class ProductOrderingTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/products/'
        self.p1 = ProductFactory(name='Alpha', price=Decimal('100000'), is_active=True)
        self.p2 = ProductFactory(name='Beta', price=Decimal('300000'), is_active=True)
        self.p3 = ProductFactory(name='Gamma', price=Decimal('200000'), is_active=True)

    def test_order_by_price_ascending(self):
        response = self.client.get(self.url, {'ordering': 'price'})
        names = [p['name'] for p in response.data['results']]
        self.assertEqual(names, ['Alpha', 'Gamma', 'Beta'])

    def test_order_by_price_descending(self):
        response = self.client.get(self.url, {'ordering': '-price'})
        names = [p['name'] for p in response.data['results']]
        self.assertEqual(names, ['Beta', 'Gamma', 'Alpha'])

    def test_order_by_name(self):
        response = self.client.get(self.url, {'ordering': 'name'})
        names = [p['name'] for p in response.data['results']]
        self.assertEqual(names, ['Alpha', 'Beta', 'Gamma'])

    def test_default_ordering_by_created_at_desc(self):
        response = self.client.get(self.url)
        ids = [p['id'] for p in response.data['results']]
        self.assertEqual(ids[0], self.p3.id)

    def test_order_by_rating(self):
        self.p1.rating = Decimal('4.50')
        self.p1.save(update_fields=['rating'])
        self.p2.rating = Decimal('3.00')
        self.p2.save(update_fields=['rating'])
        response = self.client.get(self.url, {'ordering': '-rating'})
        self.assertEqual(response.data['results'][0]['id'], self.p1.id)


# ─── Reviews ────────────────────────────────────────────────

class ReviewCreateTest(APITestCase):
    def setUp(self):
        self.user, self.token = create_user_with_token()
        self.product = ProductFactory(is_active=True)
        self.url = '/api/products/reviews/'

    def test_create_review_authenticated(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        response = self.client.post(self.url, {
            'product': self.product.id,
            'rating': 5,
            'title': 'Great product',
            'comment': 'Really loved it!',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Review.objects.count(), 1)

    def test_create_review_unauthenticated_returns_401(self):
        response = self.client.post(self.url, {
            'product': self.product.id,
            'rating': 5,
            'title': 'Great',
            'comment': 'Loved it',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_review_updates_product_rating(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.client.post(self.url, {
            'product': self.product.id,
            'rating': 4,
            'title': 'Good',
            'comment': 'Good product',
        })
        self.product.refresh_from_db()
        self.assertEqual(self.product.review_count, 1)

    def test_create_review_with_invalid_rating_below_1(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        response = self.client.post(self.url, {
            'product': self.product.id,
            'rating': 0,
            'title': 'Bad',
            'comment': 'Terrible',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_review_with_invalid_rating_above_5(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        response = self.client.post(self.url, {
            'product': self.product.id,
            'rating': 6,
            'title': 'Bad',
            'comment': 'Terrible',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_review_prevented(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.client.post(self.url, {
            'product': self.product.id,
            'rating': 5,
            'title': 'First',
            'comment': 'First review',
        })
        response = self.client.post(self.url, {
            'product': self.product.id,
            'rating': 3,
            'title': 'Second',
            'comment': 'Second review',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Review.objects.count(), 1)


class ReviewUpdateTest(APITestCase):
    def setUp(self):
        self.owner, self.token = create_user_with_token()
        self.other, self.other_token = create_user_with_token()
        self.product = ProductFactory(is_active=True)
        self.review = ReviewFactory(
            product=self.product,
            user=self.owner,
            rating=4,
            title='Original',
            comment='Original comment',
        )
        self.url = f'/api/products/reviews/{self.review.id}/'

    def test_owner_can_update(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        response = self.client.patch(self.url, {'rating': 5, 'title': 'Updated'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.review.refresh_from_db()
        self.assertEqual(self.review.rating, 5)

    def test_other_user_cannot_update(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.other_token}')
        response = self.client.patch(self.url, {'rating': 1})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_update(self):
        response = self.client.patch(self.url, {'rating': 1})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_triggers_rating_recalculation(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.client.patch(self.url, {'rating': 2})
        self.product.refresh_from_db()
        self.assertEqual(self.product.rating, Decimal('2.00'))


class ReviewDeleteTest(APITestCase):
    def setUp(self):
        self.owner, self.token = create_user_with_token()
        self.other, self.other_token = create_user_with_token()
        self.product = ProductFactory(is_active=True, rating=Decimal('3.00'), review_count=1)
        self.review = ReviewFactory(product=self.product, user=self.owner, rating=3)
        self.url = f'/api/products/reviews/{self.review.id}/'

    def test_owner_can_delete(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Review.objects.count(), 0)

    def test_other_user_cannot_delete(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.other_token}')
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Review.objects.count(), 1)

    def test_delete_updates_product_rating(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.client.delete(self.url)
        self.product.refresh_from_db()
        self.assertEqual(self.product.review_count, 0)


class ReviewListFilterTest(APITestCase):
    def setUp(self):
        self.product = ProductFactory(is_active=True)
        self.url = '/api/products/reviews/'

    def test_list_reviews_filter_by_product(self):
        r1 = ReviewFactory(product=self.product, rating=5)
        r2 = ReviewFactory(product=self.product, rating=3)
        other_product = ProductFactory(is_active=True)
        ReviewFactory(product=other_product, rating=4)
        response = self.client.get(self.url, {'product': self.product.id})
        self.assertEqual(response.data['count'], 2)

    def test_list_reviews_filter_by_rating(self):
        ReviewFactory(product=self.product, rating=5)
        ReviewFactory(product=self.product, rating=3)
        response = self.client.get(self.url, {'rating': 5})
        self.assertEqual(response.data['count'], 1)


# ─── Wishlist ───────────────────────────────────────────────

class WishlistAddTest(APITestCase):
    def setUp(self):
        self.user, self.token = create_user_with_token()
        self.product = ProductFactory(is_active=True)
        self.url = '/api/products/wishlist/'

    def test_add_to_wishlist(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        response = self.client.post(self.url, {'product_id': self.product.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Wishlist.objects.count(), 1)

    def test_add_duplicate_prevented(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        self.client.post(self.url, {'product_id': self.product.id})
        response = self.client.post(self.url, {'product_id': self.product.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Wishlist.objects.count(), 1)

    def test_add_unauthenticated_returns_401(self):
        response = self.client.post(self.url, {'product_id': self.product.id})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class WishlistRemoveTest(APITestCase):
    def setUp(self):
        self.user, self.token = create_user_with_token()
        self.product = ProductFactory(is_active=True)
        self.wishlist_item = WishlistFactory(user=self.user, product=self.product)
        self.url = f'/api/products/wishlist/{self.wishlist_item.id}/'

    def test_remove_from_wishlist(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Wishlist.objects.count(), 0)

    def test_remove_unauthenticated_returns_401(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class WishlistCheckTest(APITestCase):
    def setUp(self):
        self.user, self.token = create_user_with_token()
        self.product = ProductFactory(is_active=True)
        self.url = '/api/products/wishlist/'

    def test_wishlist_list_shows_only_own_items(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')
        WishlistFactory(user=self.user, product=self.product)
        other_user, _ = create_user_with_token()
        WishlistFactory(user=other_user, product=self.product)
        response = self.client.get(self.url)
        self.assertEqual(response.data['count'], 1)


class WishlistOwnershipTest(APITestCase):
    def setUp(self):
        self.user, self.token = create_user_with_token()
        self.other, self.other_token = create_user_with_token()
        self.product = ProductFactory(is_active=True)
        self.wishlist_item = WishlistFactory(user=self.user, product=self.product)
        self.url = f'/api/products/wishlist/{self.wishlist_item.id}/'

    def test_user_cannot_delete_others_wishlist(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.other_token}')
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Wishlist.objects.count(), 1)


# ─── Homepage Sections ─────────────────────────────────────

class HomepageSectionsTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/homepage-sections/'

    def test_active_sections_returned(self):
        HomepageSection.objects.create(
            title='New Arrivals', filter_type='new', is_active=True, order=1
        )
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'New Arrivals')

    def test_inactive_sections_not_returned(self):
        HomepageSection.objects.create(
            title='Hidden', filter_type='new', is_active=False
        )
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 0)

    def test_section_includes_products(self):
        section = HomepageSection.objects.create(
            title='Featured', filter_type='featured', is_active=True
        )
        ProductFactory(is_featured=True, is_active=True)
        response = self.client.get(self.url)
        self.assertEqual(response.data[0]['filter_type'], 'featured')
        self.assertEqual(len(response.data[0]['products']), 1)

    def test_trending_section_only_includes_trending_products(self):
        HomepageSection.objects.create(
            title='Trending', filter_type='trending', is_active=True
        )
        trending = ProductFactory(is_trending=True, is_active=True, rating=Decimal('4.50'))
        ProductFactory(is_trending=False, is_active=True)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data[0]['products']), 1)
        self.assertEqual(response.data[0]['products'][0]['id'], trending.id)

    def test_sections_ordered_by_order_field(self):
        HomepageSection.objects.create(title='B', filter_type='new', is_active=True, order=2)
        HomepageSection.objects.create(title='A', filter_type='new', is_active=True, order=1)
        response = self.client.get(self.url)
        titles = [s['title'] for s in response.data]
        self.assertEqual(titles, ['A', 'B'])

    def test_max_15_products_per_section(self):
        HomepageSection.objects.create(
            title='New', filter_type='new', is_active=True
        )
        ProductFactory.create_batch(20, is_active=True)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data[0]['products']), 15)


# ─── Banners ────────────────────────────────────────────────

class BannerListTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/banners/'

    def test_list_active_banners(self):
        b1 = Banner.objects.create(title='Banner 1', is_active=True, order=1)
        b2 = Banner.objects.create(title='Banner 2', is_active=False)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Banner 1')

    def test_empty_banner_list(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)


# ─── Categories ─────────────────────────────────────────────

class CategoryListTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/categories/'

    def test_list_categories(self):
        CategoryFactory(name='Men', slug='men')
        CategoryFactory(name='Women', slug='women')
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

    def test_hierarchical_categories_include_children(self):
        parent = CategoryFactory(name='Clothing', slug='clothing')
        child = CategoryFactory(name='Shirts', slug='shirts', parent=parent)
        response = self.client.get(self.url)
        parent_data = next(c for c in response.data['results'] if c['id'] == parent.id)
        self.assertEqual(len(parent_data['children']), 1)
        self.assertEqual(parent_data['children'][0]['name'], 'Shirts')

    def test_category_search(self):
        CategoryFactory(name='Electronics', slug='electronics')
        CategoryFactory(name='Clothing', slug='clothing')
        response = self.client.get(self.url, {'search': 'Electro'})
        self.assertEqual(response.data['count'], 1)


# ─── Style Looks ────────────────────────────────────────────

class StyleLookListTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/styles/'

    def test_list_active_style_looks(self):
        StyleLook.objects.create(title='Summer Style', slug='summer', is_active=True)
        StyleLook.objects.create(title='Hidden Style', slug='hidden', is_active=False)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Summer Style')


class StyleLookDetailTest(APITestCase):
    def setUp(self):
        self.style = StyleLook.objects.create(
            title='Summer Collection', slug='summer-collection', is_active=True
        )
        self.url = f'/api/products/styles/{self.style.slug}/'

    def test_detail_by_slug(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Summer Collection')

    def test_404_for_nonexistent_slug(self):
        response = self.client.get('/api/products/styles/does-not-exist/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_404_for_inactive_style(self):
        StyleLook.objects.create(title='H', slug='inactive-style', is_active=False)
        response = self.client.get('/api/products/styles/inactive-style/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ─── Recommendations ───────────────────────────────────────

class RecommendationsTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/recommendations/'
        self.category = CategoryFactory(slug='men')

    def test_trending_products_returned_when_no_product_id(self):
        trending = ProductFactory(is_trending=True, is_active=True, rating=Decimal('4.50'), category=self.category)
        ProductFactory(is_trending=False, is_active=True, category=self.category)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [p['id'] for p in response.data]
        self.assertIn(trending.id, ids)

    def test_category_based_recommendations(self):
        product = ProductFactory(category=self.category, is_active=True)
        same_cat = ProductFactory(category=self.category, is_active=True, rating=Decimal('4.00'))
        other_cat = CategoryFactory(slug='women')
        diff_cat = ProductFactory(category=other_cat, is_active=True)
        response = self.client.get(self.url, {'product_id': product.id})
        ids = [p['id'] for p in response.data]
        self.assertIn(same_cat.id, ids)
        self.assertNotIn(product.id, ids)
        self.assertNotIn(diff_cat.id, ids)

    def test_nonexistent_product_falls_back_to_trending(self):
        trending = ProductFactory(is_trending=True, is_active=True, rating=Decimal('5.00'))
        response = self.client.get(self.url, {'product_id': 99999})
        ids = [p['id'] for p in response.data]
        self.assertIn(trending.id, ids)

    def test_recommendations_max_8(self):
        product = ProductFactory(category=self.category, is_active=True)
        ProductFactory.create_batch(10, category=self.category, is_active=True)
        response = self.client.get(self.url, {'product_id': product.id})
        self.assertLessEqual(len(response.data), 8)


# ─── Max Price ──────────────────────────────────────────────

class MaxPriceViewTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/max-price/'

    def test_returns_max_price(self):
        ProductFactory(price=Decimal('100000'), is_active=True)
        ProductFactory(price=Decimal('500000'), is_active=True)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['max_price'], 500000)

    def test_returns_default_when_no_products(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['max_price'], 5000000)

    def test_ignores_inactive_products(self):
        ProductFactory(price=Decimal('999000'), is_active=False)
        response = self.client.get(self.url)
        self.assertEqual(response.data['max_price'], 5000000)


# ─── Size Recommendation ───────────────────────────────────

class SizeRecommendationViewTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/size-recommendation/'

    def test_post_without_measurements_returns_400(self):
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_post_with_empty_measurements_returns_400(self):
        response = self.client.post(self.url, {'measurements': {}}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ─── Brands, Colors, Sizes, Fabrics ────────────────────────

class BrandViewSetTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/brands/'

    def test_list_brands(self):
        BrandFactory(name='Nike', slug='nike')
        BrandFactory(name='Adidas', slug='adidas')
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

    def test_brand_search(self):
        BrandFactory(name='Nike', slug='nike')
        BrandFactory(name='Adidas', slug='adidas')
        response = self.client.get(self.url, {'search': 'Nike'})
        self.assertEqual(response.data['count'], 1)


class ColorViewSetTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/colors/'

    def test_list_colors(self):
        ColorFactory(name='Red', hex_code='#FF0000')
        ColorFactory(name='Blue', hex_code='#0000FF')
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)


class SizeViewSetTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/sizes/'

    def test_list_sizes(self):
        cat = CategoryFactory()
        SizeFactory(name='S', category=cat)
        SizeFactory(name='M', category=cat)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

    def test_filter_sizes_by_category(self):
        cat1 = CategoryFactory()
        cat2 = CategoryFactory()
        SizeFactory(name='S', category=cat1)
        SizeFactory(name='XL', category=cat2)
        response = self.client.get(self.url, {'category': cat1.id})
        self.assertEqual(response.data['count'], 1)


class FabricViewSetTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/fabrics/'

    def test_list_fabrics(self):
        FabricFactory(name='Cotton')
        FabricFactory(name='Silk')
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)


# ─── Categories by Root ─────────────────────────────────────

class CategoriesByRootTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/categories/by-root/'

    def test_empty_root_returns_empty(self):
        response = self.client.get(self.url, {'root': ''})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_nonexistent_root_returns_empty(self):
        response = self.client.get(self.url, {'root': 'nonexistent'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_returns_root_category_with_children(self):
        root = CategoryFactory(name='Men', slug='men')
        child = CategoryFactory(name='Shirts', slug='shirts', parent=root)
        response = self.client.get(self.url, {'root': 'Men'})
        self.assertEqual(response.data['name'], 'Men')
        self.assertIn('children', response.data)
        self.assertEqual(response.data['children'][0]['name'], 'Shirts')


# ─── Admin Product Search ───────────────────────────────────

class AdminProductSearchTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/admin-search/'
        self.admin, self.token = create_user_with_token(username='adminsearch')
        UserProfileFactory(user=self.admin, role='admin')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    def test_short_query_returns_empty(self):
        response = self.client.get(self.url, {'q': 'a'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_search_by_name(self):
        ProductFactory(name='Blue Cotton Shirt', is_active=True)
        ProductFactory(name='Red Silk Dress', is_active=True)
        response = self.client.get(self.url, {'q': 'Cotton'})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Blue Cotton Shirt')

    def test_search_by_sku(self):
        ProductFactory(name='Product', sku='SKU-12345', is_active=True)
        response = self.client.get(self.url, {'q': 'SKU-123'})
        self.assertEqual(len(response.data), 1)


# ─── Inherited Sizes ───────────────────────────────────────

class InheritedSizesViewTest(APITestCase):
    def setUp(self):
        self.url = '/api/products/sizes/for-category/'

    def test_no_category_returns_all_sizes(self):
        cat = CategoryFactory()
        SizeFactory(name='S', category=cat)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('sizes', response.data)

    def test_category_returns_inherited_sizes(self):
        parent = CategoryFactory(name='Men')
        child = CategoryFactory(name='Shirts', parent=parent)
        s1 = SizeFactory(name='S', category=parent)
        response = self.client.get(self.url, {'category': child.id})
        self.assertTrue(response.data['inherited'])
        self.assertGreater(response.data['count'], 0)
