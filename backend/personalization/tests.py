from django.contrib import admin
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase
from datetime import timedelta

from chat.models import Conversation, Message
from loyalty.services import create_referral_attribution
from orders.models import Order
from payments.models import Payment
from products.models import Product
from style_rooms.models import StyleRoom
from style_rooms.services import create_room_message
from shop.tests import (
    BrandFactory,
    CategoryFactory,
    ColorFactory,
    FabricFactory,
    ProductFactory,
    ProductVariantFactory,
    OrderFactory,
    OrderItemFactory,
    PaymentFactory,
    SizeFactory,
    UserFactory,
)

from .admin import BehaviorEventAdmin, EventWeightAdmin, UserPreferenceAdmin
from .models import (
    BehaviorEvent,
    DEFAULT_EVENT_WEIGHTS,
    EventType,
    EventWeight,
    TaxonomyDimension,
    UserPreference,
)
from .services import (
    record_behavior,
    record_product_share,
    record_purchase_events_for_order,
    refresh_preferences,
)
from .ranking import ProductRankingService, _diversify
from .taxonomy import product_dimensions


class PersonalizationServiceTests(TestCase):
    def setUp(self):
        self.user = UserFactory(username='personalization-user')
        self.other_user = UserFactory(username='other-personalization-user')
        self.root = CategoryFactory(name='Men', slug='men')
        self.subcategory = CategoryFactory(name='Pants', slug='pants', parent=self.root)
        self.brand = BrandFactory(name='Brand X', slug='brand-x')
        self.fabric = FabricFactory(name='Linen')
        self.product = ProductFactory(
            category=self.subcategory,
            brand=self.brand,
            fabric=self.fabric,
            main_category=Product.CATEGORY_CHOICES[0][0],
        )
        self.variant = ProductVariantFactory(
            product=self.product,
            size=SizeFactory(category=self.subcategory),
            color=ColorFactory(name='Black'),
        )

    def test_default_and_configured_event_weights(self):
        event, created = record_behavior(
            user=self.user,
            event_type=EventType.WISHLIST_ADD,
            product=self.product,
            source='test',
        )
        self.assertTrue(created)
        self.assertEqual(event.event_type, EventType.WISHLIST_ADD)
        preference = UserPreference.objects.get(
            user=self.user, dimension=TaxonomyDimension.BRAND, value_key='brand-x'
        )
        self.assertEqual(preference.score, DEFAULT_EVENT_WEIGHTS[EventType.WISHLIST_ADD])

        EventWeight.objects.create(event_type=EventType.WISHLIST_ADD, weight=10)
        record_behavior(user=self.user, event_type=EventType.WISHLIST_ADD, product=self.product, source='test')
        self.assertEqual(
            UserPreference.objects.get(
                user=self.user, dimension=TaxonomyDimension.BRAND, value_key='brand-x'
            ).score,
            16,
        )

    def test_taxonomy_extracts_supported_dimensions(self):
        dimensions = product_dimensions(self.product)
        self.assertEqual(dimensions[TaxonomyDimension.CATEGORY], [('men', 'Men')])
        self.assertEqual(dimensions[TaxonomyDimension.SUBCATEGORY], [('pants', 'Pants')])
        self.assertEqual(dimensions[TaxonomyDimension.BRAND], [('brand-x', 'Brand X')])
        self.assertEqual(dimensions[TaxonomyDimension.FABRIC], [(str(self.fabric.id), 'Linen')])
        self.assertEqual(dimensions[TaxonomyDimension.COLOR], [(str(self.variant.color_id), 'Black')])

    def test_positive_negative_and_accumulating_events(self):
        record_behavior(user=self.user, event_type=EventType.CART_ADD, product=self.product, source='test')
        record_behavior(user=self.user, event_type=EventType.CART_REMOVE, product=self.product, source='test')
        record_behavior(user=self.user, event_type=EventType.PRODUCT_VIEW, product=self.product, source='test')
        preference = UserPreference.objects.get(
            user=self.user, dimension=TaxonomyDimension.SUBCATEGORY, value_key='pants'
        )
        self.assertEqual(preference.score, 8 - 3 + 1)
        self.assertIsNotNone(preference.last_event_at)

    def test_idempotent_events_do_not_double_score(self):
        first, created = record_behavior(
            user=self.user,
            event_type=EventType.REVIEW,
            product=self.product,
            source='test',
            idempotency_key='review:123',
        )
        second, created_again = record_behavior(
            user=self.user,
            event_type=EventType.REVIEW,
            product=self.product,
            source='test',
            idempotency_key='review:123',
        )
        self.assertTrue(created)
        self.assertFalse(created_again)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(BehaviorEvent.objects.count(), 1)
        self.assertEqual(
            UserPreference.objects.get(
                user=self.user, dimension=TaxonomyDimension.SUBCATEGORY, value_key='pants'
            ).score,
            5,
        )

    def test_repeated_views_are_allowed(self):
        record_behavior(user=self.user, event_type=EventType.PRODUCT_VIEW, product=self.product, source='test')
        record_behavior(user=self.user, event_type=EventType.PRODUCT_VIEW, product=self.product, source='test')
        self.assertEqual(BehaviorEvent.objects.count(), 2)
        self.assertEqual(
            UserPreference.objects.get(
                user=self.user, dimension=TaxonomyDimension.SUBCATEGORY, value_key='pants'
            ).score,
            2,
        )

    def test_user_isolation(self):
        record_behavior(user=self.user, event_type=EventType.PURCHASE, product=self.product, source='test')
        self.assertFalse(UserPreference.objects.filter(user=self.other_user).exists())
        self.assertEqual(BehaviorEvent.objects.filter(user=self.user).count(), 1)

    def test_successful_paid_order_creates_one_event_per_item(self):
        order = OrderFactory(user=self.user, payment_status='paid', status='pending_payment')
        first_item = OrderItemFactory(order=order, product=self.product)
        second_product = ProductFactory(category=self.subcategory, brand=self.brand, fabric=self.fabric)
        second_item = OrderItemFactory(order=order, product=second_product)
        payment = PaymentFactory(order=order, user=self.user, status='success')

        events = record_purchase_events_for_order(order=order, payment=payment)

        self.assertEqual(len(events), 2)
        self.assertEqual(
            BehaviorEvent.objects.filter(user=self.user, event_type=EventType.PURCHASE).count(), 2
        )
        self.assertEqual(
            UserPreference.objects.get(
                user=self.user, dimension=TaxonomyDimension.SUBCATEGORY, value_key='pants'
            ).score,
            30,
        )
        self.assertTrue(BehaviorEvent.objects.filter(idempotency_key=f'purchase:order-item:{first_item.pk}').exists())
        self.assertTrue(BehaviorEvent.objects.filter(idempotency_key=f'purchase:order-item:{second_item.pk}').exists())

    def test_failed_or_unpaid_order_creates_no_purchase_event(self):
        order = OrderFactory(user=self.user, payment_status='unpaid')
        OrderItemFactory(order=order, product=self.product)
        failed_payment = PaymentFactory(order=order, user=self.user, status='failed')
        self.assertEqual(record_purchase_events_for_order(order=order, payment=failed_payment), [])
        paid_payment = PaymentFactory(order=OrderFactory(user=self.user, payment_status='paid'), user=self.user, status='success')
        self.assertEqual(record_purchase_events_for_order(order=paid_payment.order, payment=paid_payment), [])
        self.assertFalse(BehaviorEvent.objects.filter(event_type=EventType.PURCHASE).exists())

    def test_duplicate_purchase_callback_does_not_score_twice(self):
        order = OrderFactory(user=self.user, payment_status='paid')
        OrderItemFactory(order=order, product=self.product)
        payment = PaymentFactory(order=order, user=self.user, status='success')
        record_purchase_events_for_order(order=order, payment=payment)
        record_purchase_events_for_order(order=order, payment=payment)
        self.assertEqual(BehaviorEvent.objects.filter(event_type=EventType.PURCHASE).count(), 1)
        self.assertEqual(
            UserPreference.objects.get(
                user=self.user, dimension=TaxonomyDimension.SUBCATEGORY, value_key='pants'
            ).score,
            15,
        )

    def test_product_share_is_idempotent(self):
        record_product_share(
            user=self.user, product=self.product, source='test', idempotency_key='share:1'
        )
        record_product_share(
            user=self.user, product=self.product, source='test', idempotency_key='share:1'
        )
        self.assertEqual(BehaviorEvent.objects.filter(event_type=EventType.PRODUCT_SHARE).count(), 1)
        self.assertEqual(
            UserPreference.objects.get(
                user=self.user, dimension=TaxonomyDimension.SUBCATEGORY, value_key='pants'
            ).score,
            4,
        )

    def test_database_uniqueness_constraint(self):
        UserPreference.objects.create(
            user=self.user, dimension=TaxonomyDimension.BRAND, value_key='brand-x'
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                UserPreference.objects.create(
                    user=self.user, dimension=TaxonomyDimension.BRAND, value_key='brand-x'
                )


class PersonalizationIntegrationTests(APITestCase):
    def setUp(self):
        self.user = UserFactory(username='integration-user')
        self.product = ProductFactory(is_active=True)
        self.client.force_authenticate(self.user)

    def test_authenticated_product_detail_records_view(self):
        response = self.client.get(f'/api/products/products/{self.product.slug}/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(BehaviorEvent.objects.filter(
            user=self.user, event_type=EventType.PRODUCT_VIEW, product=self.product,
        ).exists())

    def test_authenticated_search_records_query_without_product_preference(self):
        response = self.client.get('/api/products/products/', {'search': 'linen'})
        self.assertEqual(response.status_code, 200)
        event = BehaviorEvent.objects.get(user=self.user, event_type=EventType.SEARCH)
        self.assertEqual(event.metadata['query'], 'linen')
        self.assertIsNone(event.product_id)

    def test_wishlist_and_cart_integrations_record_events(self):
        wishlist = self.client.post('/api/products/wishlist/', {'product_id': self.product.id}, format='json')
        self.assertEqual(wishlist.status_code, 201)
        self.assertTrue(BehaviorEvent.objects.filter(
            user=self.user, event_type=EventType.WISHLIST_ADD, product=self.product,
        ).exists())
        cart = self.client.post('/api/cart/add_item/', {'product_id': self.product.id, 'quantity': 1}, format='json')
        self.assertEqual(cart.status_code, 201)
        self.assertTrue(BehaviorEvent.objects.filter(
            user=self.user, event_type=EventType.CART_ADD, product=self.product,
        ).exists())

    def test_private_chat_product_share_records_event(self):
        other = UserFactory(username='chat-share-recipient')
        conversation, _ = Conversation.get_or_create_pair(self.user, other, requester=self.user)
        conversation.status = Conversation.STATUS_ACCEPTED
        conversation.save(update_fields=['status'])
        response = self.client.post(
            f'/api/chat/conversations/{conversation.pk}/send_product/',
            {'product_id': self.product.id}, format='json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(BehaviorEvent.objects.filter(
            user=self.user, event_type=EventType.PRODUCT_SHARE, source='private_chat',
        ).exists())

    def test_style_room_product_share_records_event(self):
        room = StyleRoom.objects.create(owner=self.user, title='Share room')
        message = create_room_message(room, self.user, product=self.product)
        self.assertTrue(BehaviorEvent.objects.filter(
            user=self.user,
            event_type=EventType.PRODUCT_SHARE,
            idempotency_key=f'product-share:message:{message.pk}',
        ).exists())

    def test_referral_for_existing_product_message_does_not_duplicate_share_event(self):
        other = UserFactory(username='referral-recipient')
        conversation, _ = Conversation.get_or_create_pair(self.user, other, requester=self.user)
        message = Message.objects.create(
            conversation=conversation, sender=self.user, product=self.product,
        )
        create_referral_attribution(referrer=self.user, product=self.product, originating_message=message)
        create_referral_attribution(referrer=self.user, product=self.product, originating_message=message)
        self.assertEqual(BehaviorEvent.objects.filter(
            user=self.user, event_type=EventType.PRODUCT_SHARE,
            idempotency_key=f'product-share:message:{message.pk}',
        ).count(), 1)


class PersonalizationAdminTests(TestCase):
    def test_models_are_registered_with_safe_admins(self):
        self.assertIsInstance(admin.site._registry[EventWeight], EventWeightAdmin)
        self.assertIsInstance(admin.site._registry[BehaviorEvent], BehaviorEventAdmin)
        self.assertIsInstance(admin.site._registry[UserPreference], UserPreferenceAdmin)
        self.assertFalse(admin.site._registry[BehaviorEvent].has_add_permission(None))
        self.assertFalse(admin.site._registry[BehaviorEvent].has_change_permission(None))
        self.assertFalse(admin.site._registry[BehaviorEvent].has_delete_permission(None))


class PreferenceRefreshAndRankingTests(APITestCase):
    def setUp(self):
        self.user = UserFactory(username='ranking-user')
        self.other_user = UserFactory(username='other-ranking-user')
        self.root = CategoryFactory(name='Men', slug='ranking-men')
        self.pants = CategoryFactory(name='Pants', slug='ranking-pants', parent=self.root)
        self.shirts = CategoryFactory(name='Shirts', slug='ranking-shirts', parent=self.root)
        self.brand = BrandFactory(name='Ranking Brand', slug='ranking-brand')
        self.fabric = FabricFactory(name='Ranking Linen')
        self.black = ColorFactory(name='Ranking Black')
        self.size = SizeFactory(category=self.pants)
        self.favorite = ProductFactory(
            name='Favorite Pants', category=self.pants, brand=self.brand, fabric=self.fabric,
            main_category=Product.CATEGORY_CHOICES[0][0], stock=20,
        )
        ProductVariantFactory(product=self.favorite, size=self.size, color=self.black, stock=10)
        self.related = ProductFactory(
            name='Related Shirt', category=self.shirts, brand=self.brand, fabric=self.fabric,
            main_category=Product.CATEGORY_CHOICES[0][0], stock=20,
        )
        ProductVariantFactory(product=self.related, size=SizeFactory(category=self.shirts), color=self.black, stock=10)
        self.unrelated = ProductFactory(
            name='Unrelated Product', category=CategoryFactory(name='Women', slug='ranking-women'),
            brand=BrandFactory(name='Other Brand', slug='other-brand'),
            fabric=FabricFactory(name='Other Fabric'),
            stock=20,
        )
        self.out_of_stock = ProductFactory(stock=0)
        self.inactive = ProductFactory(is_active=False, stock=20)

    def test_refresh_applies_recency_and_purchase_persistence(self):
        now = timezone.now()
        BehaviorEvent.objects.create(
            user=self.user, event_type=EventType.PRODUCT_VIEW, product=self.favorite,
            occurred_at=now - timedelta(days=30),
        )
        BehaviorEvent.objects.create(
            user=self.user, event_type=EventType.PURCHASE, product=self.favorite,
            occurred_at=now - timedelta(days=180),
        )
        preferences = refresh_preferences(user=self.user, now=now)
        subcategory = next(item for item in preferences if item.value_key == 'ranking-pants')
        self.assertGreater(subcategory.score, 5)
        self.assertLessEqual(subcategory.score, 16)

    def test_refresh_is_deterministic_and_caps_scores(self):
        now = timezone.now()
        BehaviorEvent.objects.bulk_create([
            BehaviorEvent(
                user=self.user, event_type=EventType.PRODUCT_VIEW,
                product=self.favorite, occurred_at=now,
            ) for _ in range(1500)
        ])
        first = refresh_preferences(user=self.user, now=now)
        first_scores = [(item.dimension, item.value_key, item.score) for item in first]
        second = refresh_preferences(user=self.user, now=now)
        second_scores = [(item.dimension, item.value_key, item.score) for item in second]
        self.assertEqual(first_scores, second_scores)
        self.assertLessEqual(max(item.score for item in second), 1000)

    def test_negative_events_reduce_refresh_score(self):
        now = timezone.now()
        BehaviorEvent.objects.create(user=self.user, event_type=EventType.WISHLIST_ADD, product=self.favorite, occurred_at=now)
        BehaviorEvent.objects.create(user=self.user, event_type=EventType.WISHLIST_REMOVE, product=self.favorite, occurred_at=now)
        refresh_preferences(user=self.user, now=now)
        preference = UserPreference.objects.get(
            user=self.user, dimension=TaxonomyDimension.SUBCATEGORY, value_key='ranking-pants'
        )
        self.assertEqual(preference.score, 2)

    def test_high_affinity_product_ranks_first_with_explanations(self):
        record_behavior(user=self.user, event_type=EventType.PURCHASE, product=self.favorite, source='test')
        ranked = ProductRankingService().rank(
            user=self.user,
            candidates=[self.unrelated, self.related, self.favorite],
            limit=3,
            use_cache=False,
        )
        self.assertEqual(ranked[0].product.id, self.favorite.id)
        self.assertTrue(any(reason['dimension'] == TaxonomyDimension.SUBCATEGORY for reason in ranked[0].reasons))
        self.assertTrue(any(reason['dimension'] == TaxonomyDimension.BRAND for reason in ranked[0].reasons))

    def test_low_affinity_and_unavailable_products_are_excluded(self):
        record_behavior(user=self.user, event_type=EventType.PURCHASE, product=self.favorite, source='test')
        ranked = ProductRankingService().rank(
            user=self.user,
            candidates=[self.favorite, self.out_of_stock, self.inactive],
            limit=10,
            use_cache=False,
        )
        ids = [item.product.id for item in ranked]
        self.assertIn(self.favorite.id, ids)
        self.assertNotIn(self.out_of_stock.id, ids)
        self.assertNotIn(self.inactive.id, ids)

    def test_cold_start_uses_fallback_and_limit(self):
        ranked = ProductRankingService().rank(user=self.user, limit=2)
        self.assertLessEqual(len(ranked), 2)
        self.assertTrue(all(item.score == 0 for item in ranked))

    def test_ranking_is_user_isolated_and_repeatable(self):
        record_behavior(user=self.user, event_type=EventType.PURCHASE, product=self.favorite, source='test')
        first = ProductRankingService().rank(user=self.user, candidates=[self.favorite, self.related], use_cache=True)
        second = ProductRankingService().rank(user=self.user, candidates=[self.favorite, self.related], use_cache=True)
        other = ProductRankingService().rank(user=self.other_user, candidates=[self.favorite, self.related], use_cache=False)
        self.assertEqual([item.product.id for item in first], [item.product.id for item in second])
        self.assertTrue(first[0].score > other[0].score or other[0].score == 0)

    def test_diversity_caps_repeated_subcategory(self):
        same_a = ProductFactory(category=self.pants, stock=20)
        same_b = ProductFactory(category=self.pants, stock=20)
        other_group = ProductFactory(category=self.shirts, stock=20)
        from .ranking import RankedProduct
        ranked = [
            RankedProduct(same_a, 10, tuple()),
            RankedProduct(same_b, 9, tuple()),
            RankedProduct(ProductFactory(category=self.pants, stock=20), 8, tuple()),
            RankedProduct(other_group, 1, tuple()),
        ]
        diversified = _diversify(ranked, 4)
        groups = [_product_group_for_test(item.product) for item in diversified]
        self.assertLessEqual(groups.count('ranking-pants'), 3)
        self.assertIn('ranking-shirts', groups)

    def test_authenticated_ranking_endpoint_returns_limited_results(self):
        self.client.force_authenticate(self.user)
        response = self.client.get('/api/personalization/recommendations/?limit=2')
        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(response.data['count'], 2)
        self.assertIn('results', response.data)

    def test_anonymous_ranking_endpoint_is_rejected(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get('/api/personalization/recommendations/').status_code, 401)


def _product_group_for_test(product):
    return product.category.slug
