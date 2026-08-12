"""
Cart helper services for guest + authenticated carts.

Guest carts are identified by a session_id (X-Session-ID header).
Authenticated carts are merged with any guest cart that carries the
same session_id so the guest's items survive login.
"""
import uuid
import logging

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction

from .models import Cart, CartItem
from products.models import Product, ProductVariant

logger = logging.getLogger('cart')


def get_session_id(request):
    """Return the X-Session-ID header value or None."""
    value = request.META.get('HTTP_X_SESSION_ID', '') or ''
    return value.strip() or None


def get_or_create_user_cart(user):
    """Return (and create if needed) the single cart for an authenticated user."""
    try:
        with transaction.atomic():
            return Cart.objects.get_or_create(user=user)[0]
    except IntegrityError:
        return Cart.objects.get(user=user)


def get_or_create_guest_cart(session_id):
    try:
        with transaction.atomic():
            return Cart.objects.get_or_create(
                user=None, session_id=session_id,
            )[0]
    except IntegrityError:
        return Cart.objects.get(user=None, session_id=session_id)


@transaction.atomic
def merge_guest_cart_into_user_cart(user, session_id):
    """
    Move every item of the guest cart (matched by session_id) into the
    authenticated user's cart, respecting available stock. The guest cart
    is deleted afterwards.
    """
    if not session_id:
        return None

    # Locking the user gives all merges for one account a stable first lock,
    # including the case where that account does not have a cart yet.
    get_user_model().objects.select_for_update().get(pk=user.pk)
    guest_cart = (
        Cart.objects.select_for_update()
        .filter(session_id=session_id, user__isnull=True)
        .first()
    )
    if guest_cart is None:
        return None

    user_cart = (
        Cart.objects.select_for_update().filter(user=user).first()
        or Cart.objects.create(user=user)
    )
    guest_items = list(
        CartItem.objects.select_for_update()
        .filter(cart=guest_cart)
        .order_by('pk')
    )
    existing_items = {
        (item.product_id, item.variant_id): item
        for item in CartItem.objects.select_for_update()
        .filter(cart=user_cart)
        .order_by('pk')
    }

    product_ids = {item.product_id for item in guest_items}
    products = {
        product.pk: product
        for product in Product.objects.select_for_update().filter(pk__in=product_ids)
    }
    variant_ids = {item.variant_id for item in guest_items if item.variant_id}
    variants = {
        variant.pk: variant
        for variant in ProductVariant.objects.select_for_update().filter(pk__in=variant_ids)
    }

    for guest_item in guest_items:
        product = products[guest_item.product_id]
        variant = variants.get(guest_item.variant_id)
        available = max(
            variant.stock if variant is not None and variant.stock is not None else product.stock,
            0,
        )
        key = (guest_item.product_id, guest_item.variant_id)
        existing = existing_items.get(key)

        # An out-of-stock guest item is intentionally dropped. An existing
        # user item is left unchanged; merge must never persist quantity=0.
        if available == 0:
            continue

        quantity = min(
            guest_item.quantity + (existing.quantity if existing else 0),
            available,
        )
        if existing:
            existing.quantity = quantity
            existing.save(update_fields=['quantity'])
        else:
            existing_items[key] = CartItem.objects.create(
                cart=user_cart,
                product_id=guest_item.product_id,
                variant_id=guest_item.variant_id,
                quantity=quantity,
            )

    guest_cart.delete()
    logger.info(
        '[cart_merged] user_id=%d session=%s',
        user.id, session_id,
    )
    return user_cart


def get_or_create_cart(request):
    """
    Return the cart for the current request plus a session_id.

    For authenticated users the guest cart (if any) is merged in and a
    session_id is only returned if one was present on the request. For
    anonymous users a session_id is generated if the request did not
    already carry one. The result is cached on the request so a single
    session is reused across the whole request lifecycle.
    """
    cached = getattr(request, '_shop_cart', None)
    if cached is not None:
        return cached[0], cached[1]

    if request.user.is_authenticated:
        session_id = get_session_id(request)
        merge_guest_cart_into_user_cart(request.user, session_id)
        cart = get_or_create_user_cart(request.user)
        request._shop_cart = (cart, session_id)
        return cart, session_id

    session_id = get_session_id(request)
    if not session_id:
        session_id = str(uuid.uuid4())
    cart = get_or_create_guest_cart(session_id)
    request._shop_cart = (cart, session_id)
    return cart, session_id


def apply_session_header(response, session_id):
    """Set the X-Session-ID response header so the client can persist it."""
    if session_id:
        response['X-Session-ID'] = session_id
    return response
