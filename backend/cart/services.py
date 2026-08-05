"""
Cart helper services for guest + authenticated carts.

Guest carts are identified by a session_id (X-Session-ID header).
Authenticated carts are merged with any guest cart that carries the
same session_id so the guest's items survive login.
"""
import uuid
import logging

from .models import Cart, CartItem

logger = logging.getLogger('cart')


def get_session_id(request):
    """Return the X-Session-ID header value or None."""
    value = request.META.get('HTTP_X_SESSION_ID', '') or ''
    return value.strip() or None


def get_or_create_user_cart(user):
    """Return (and create if needed) the single cart for an authenticated user."""
    cart = Cart.objects.filter(user=user).first()
    if not cart:
        cart = Cart.objects.create(user=user)
    Cart.objects.filter(user=user).exclude(id=cart.id).delete()
    return cart


def get_or_create_guest_cart(session_id):
    cart = Cart.objects.filter(session_id=session_id).first()
    if not cart:
        cart = Cart.objects.create(session_id=session_id)
    return cart


def merge_guest_cart_into_user_cart(user, session_id):
    """
    Move every item of the guest cart (matched by session_id) into the
    authenticated user's cart, respecting available stock. The guest cart
    is deleted afterwards.
    """
    if not session_id:
        return
    try:
        guest_cart = Cart.objects.get(session_id=session_id, user__isnull=True)
    except Cart.DoesNotExist:
        return

    user_cart = get_or_create_user_cart(user)

    for guest_item in guest_cart.items.select_related('product', 'variant').all():
        available = (
            guest_item.variant.effective_stock
            if guest_item.variant else guest_item.product.stock
        )
        existing = user_cart.items.filter(
            product=guest_item.product, variant=guest_item.variant
        ).first()
        if existing:
            existing.quantity = min(existing.quantity + guest_item.quantity, available)
            existing.save(update_fields=['quantity'])
        else:
            if available >= 1:
                CartItem.objects.create(
                    cart=user_cart,
                    product=guest_item.product,
                    variant=guest_item.variant,
                    quantity=min(guest_item.quantity, available),
                )

    guest_cart.delete()
    logger.info(
        '[cart_merged] user_id=%d session=%s',
        user.id, session_id,
    )


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
