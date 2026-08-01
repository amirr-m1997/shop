"""
Shared test factories for the entire e-commerce backend.

Uses django.test.TestCase-compatible factory patterns.
All factories create minimal data needed for testing.
"""
import factory
from factory import fuzzy
from decimal import Decimal
from datetime import timedelta
from django.contrib.auth.models import User
from django.utils import timezone

from accounts.models import UserProfile
from products.models import (
    Category, Brand, Size, Color, Fabric,
    Product, ProductImage, ProductVariant, Review, Wishlist,
)
from orders.models import ShippingAddress, Order, OrderItem, Coupon, CouponUsage
from cart.models import Cart, CartItem
from payments.models import Payment
from pages.models import SiteSettings, ContactInfo
from blog.models import BlogCategory, BlogPost


# ─── User & Auth Factories ────────────────────────────────

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ('username',)

    username = factory.Sequence(lambda n: f'user{n}')
    email = factory.LazyAttribute(lambda o: f'{o.username}@test.com')
    password = factory.PostGenerationMethodCall('set_password', 'testpass123')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    is_active = True


class UserProfileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = UserProfile

    user = factory.SubFactory(UserFactory)
    phone = factory.Sequence(lambda n: f'0912{n:07d}')
    role = 'user'


class AdminUserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f'admin{n}')
    email = factory.LazyAttribute(lambda o: f'{o.username}@admin.com')
    password = factory.PostGenerationMethodCall('set_password', 'adminpass123')
    is_staff = True
    is_active = True


class AdminProfileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = UserProfile

    user = factory.SubFactory(AdminUserFactory)
    role = 'admin'


class SuperAdminUserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f'superadmin{n}')
    email = factory.LazyAttribute(lambda o: f'{o.username}@super.com')
    password = factory.PostGenerationMethodCall('set_password', 'superpass123')
    is_staff = True
    is_active = True


class SuperAdminProfileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = UserProfile

    user = factory.SubFactory(SuperAdminUserFactory)
    role = 'super_admin'


# ─── Product Factories ────────────────────────────────────

class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category

    name = factory.Sequence(lambda n: f'Category {n}')
    slug = factory.Sequence(lambda n: f'category-{n}')


class SubCategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category

    name = factory.Sequence(lambda n: f'SubCategory {n}')
    slug = factory.Sequence(lambda n: f'subcategory-{n}')
    parent = factory.SubFactory(CategoryFactory)


class BrandFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Brand

    name = factory.Sequence(lambda n: f'Brand {n}')
    slug = factory.Sequence(lambda n: f'brand-{n}')


class SizeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Size

    name = factory.Sequence(lambda n: f'Size {n}')
    category = factory.SubFactory(CategoryFactory)


class ColorFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Color

    name = factory.Sequence(lambda n: f'Color {n}')
    hex_code = factory.LazyAttribute(lambda o: f'#{fuzzy.FuzzyText(length=6, chars="0123456789ABCDEF").fuzz()}')


class FabricFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Fabric

    name = factory.Sequence(lambda n: f'Fabric {n}')


class ProductFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Product

    name = factory.Sequence(lambda n: f'Product {n}')
    slug = factory.Sequence(lambda n: f'product-{n}')
    description = factory.Faker('text', max_nb_chars=200)
    category = factory.SubFactory(CategoryFactory)
    brand = factory.SubFactory(BrandFactory)
    price = factory.LazyFunction(lambda: Decimal('199000'))
    compare_price = factory.LazyFunction(lambda: Decimal('299000'))
    stock = 50
    is_active = True
    is_featured = False
    is_new_arrival = False
    is_trending = False
    rating = Decimal('0.00')
    review_count = 0


class ProductVariantFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ProductVariant
        django_get_or_create = ('product', 'size', 'color')

    product = factory.SubFactory(ProductFactory)
    size = factory.SubFactory(SizeFactory)
    color = factory.SubFactory(ColorFactory)
    stock = 20
    price_adjustment = Decimal('0')
    sku = factory.Sequence(lambda n: f'SKU-{n:06d}')


class ProductImageFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ProductImage

    product = factory.SubFactory(ProductFactory)
    image = factory.django.ImageField(filename='test_product.jpg')
    alt_text = factory.Faker('sentence')
    order = 0
    is_primary = True


class ReviewFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Review

    product = factory.SubFactory(ProductFactory)
    user = factory.SubFactory(UserFactory)
    rating = fuzzy.FuzzyInteger(1, 5)
    title = factory.Faker('sentence')
    comment = factory.Faker('text', max_nb_chars=200)


class WishlistFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Wishlist

    user = factory.SubFactory(UserFactory)
    product = factory.SubFactory(ProductFactory)


# ─── Cart Factories ───────────────────────────────────────

class CartFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Cart

    user = factory.SubFactory(UserFactory)


class CartItemFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CartItem

    cart = factory.SubFactory(CartFactory)
    product = factory.SubFactory(ProductFactory)
    quantity = 1


# ─── Order Factories ──────────────────────────────────────

class ShippingAddressFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ShippingAddress

    user = factory.SubFactory(UserFactory)
    full_name = factory.Faker('name')
    phone = factory.Sequence(lambda n: f'0912{n:07d}')
    address_line1 = factory.Faker('address')
    city = factory.Faker('city')
    state = factory.Faker('state')
    postal_code = factory.Sequence(lambda n: f'{n:010d}')
    country = 'Iran'
    is_default = True


class OrderFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Order

    user = factory.SubFactory(UserFactory)
    shipping_address = factory.SubFactory(ShippingAddressFactory)
    status = 'pending_payment'
    payment_status = 'unpaid'
    payment_method = 'online'
    subtotal = Decimal('199000')
    shipping_cost = Decimal('0')
    tax = Decimal('0')
    discount = Decimal('0')
    total = Decimal('199000')
    expires_at = factory.LazyFunction(lambda: timezone.now() + timedelta(minutes=10))


class OrderItemFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = OrderItem

    order = factory.SubFactory(OrderFactory)
    product = factory.SubFactory(ProductFactory)
    quantity = 1
    price = Decimal('199000')


class CouponFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Coupon

    code = factory.Sequence(lambda n: f'COUPON-{n}')
    discount_type = 'percentage'
    value = Decimal('10')
    is_active = True
    valid_from = factory.LazyFunction(lambda: timezone.now() - timedelta(days=1))
    valid_until = factory.LazyFunction(lambda: timezone.now() + timedelta(days=30))


class CouponUsageFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CouponUsage

    coupon = factory.SubFactory(CouponFactory)
    user = factory.SubFactory(UserFactory)


# ─── Payment Factories ────────────────────────────────────

class PaymentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Payment

    order = factory.SubFactory(OrderFactory)
    user = factory.SubFactory(UserFactory)
    amount = Decimal('199000')
    status = 'pending'


# ─── Blog Factories ───────────────────────────────────────

class BlogCategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = BlogCategory

    name = factory.Sequence(lambda n: f'Blog Category {n}')
    slug = factory.Sequence(lambda n: f'blog-category-{n}')


class BlogPostFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = BlogPost

    title = factory.Sequence(lambda n: f'Blog Post {n}')
    slug = factory.Sequence(lambda n: f'blog-post-{n}')
    excerpt = factory.Faker('text', max_nb_chars=100)
    content = factory.Faker('text', max_nb_chars=500)
    category = factory.SubFactory(BlogCategoryFactory)
    author = factory.SubFactory(UserFactory)
    is_published = True
    published_at = factory.LazyFunction(timezone.now)


# ─── Helper Functions ─────────────────────────────────────

def create_user_with_token(**kwargs):
    """Create a user and return (user, token_string)."""
    from rest_framework.authtoken.models import Token
    user = UserFactory(**kwargs)
    token = Token.objects.create(user=user)
    return user, token.key


def create_admin_with_token(**kwargs):
    """Create an admin user with profile and return (user, token_string)."""
    from rest_framework.authtoken.models import Token
    user = AdminUserFactory(**kwargs)
    AdminProfileFactory(user=user)
    token = Token.objects.create(user=user)
    return user, token.key


def create_superadmin_with_token(**kwargs):
    """Create a super admin user with profile and return (user, token_string)."""
    from rest_framework.authtoken.models import Token
    user = SuperAdminUserFactory(**kwargs)
    SuperAdminProfileFactory(user=user)
    token = Token.objects.create(user=user)
    return user, token.key


def create_product_with_variant(**kwargs):
    """Create a product with one variant and return (product, variant)."""
    product = ProductFactory(**kwargs)
    size = SizeFactory(category=product.category)
    color = ColorFactory()
    variant = ProductVariantFactory(product=product, size=size, color=color)
    return product, variant


def create_order_with_items(item_count=2, **order_kwargs):
    """Create an order with items and return (order, items_list)."""
    order = OrderFactory(**order_kwargs)
    items = []
    for i in range(item_count):
        product = ProductFactory(price=Decimal('100000') * (i + 1))
        item = OrderItemFactory(
            order=order,
            product=product,
            quantity=i + 1,
            price=product.price,
        )
        items.append(item)
    # Update order totals
    order.subtotal = sum(item.total_price for item in items)
    order.total = order.subtotal + order.shipping_cost - order.discount
    order.save(update_fields=['subtotal', 'total'])
    return order, items


def setup_site_settings():
    """Create or return SiteSettings singleton."""
    return SiteSettings.load()


def setup_contact_info():
    """Create or return ContactInfo singleton."""
    obj, _ = ContactInfo.objects.get_or_create(pk=1)
    return obj
