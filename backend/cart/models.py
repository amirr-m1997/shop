from django.db import models
from django.contrib.auth.models import User
from products.models import Product, ProductVariant

class Cart(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='cart',
        null=True,
        blank=True,
        verbose_name="کاربر"
    )
    session_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        db_index=True,
        verbose_name="شناسه نشست مهمان"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ آخرین به‌روزرسانی")

    class Meta:
        verbose_name = "سبد خرید"
        verbose_name_plural = "سبدهای خرید"
        constraints = [
            models.CheckConstraint(
                check=models.Q(user__isnull=False) | models.Q(session_id__isnull=False),
                name="cart_user_or_session_required",
            ),
            models.UniqueConstraint(
                fields=['user'],
                condition=models.Q(user__isnull=False),
                name='unique_cart_per_user',
            ),
            models.UniqueConstraint(
                fields=['session_id'],
                condition=models.Q(user__isnull=True, session_id__isnull=False),
                name='unique_guest_cart_per_session',
            ),
        ]

    def __str__(self):
        if self.user_id:
            return f"سبد خرید - {self.user.username}"
        return f"سبد خرید مهمان - {self.session_id or 'بدون نشست'}"

    @property
    def total_price(self):
        return sum(item.total_price for item in self.items.all())

    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())


class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name="سبد خرید"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        verbose_name="محصول"
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name="نوع (واریانت)"
    )
    quantity = models.PositiveIntegerField(default=1, verbose_name="تعداد")
    added_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ افزودن")

    class Meta:
        verbose_name = "آیتم سبد خرید"
        verbose_name_plural = "آیتم‌های سبد خرید"
        constraints = [
            models.UniqueConstraint(
                fields=['cart', 'product'],
                condition=models.Q(variant__isnull=True),
                name='unique_cart_product_without_variant',
            ),
            models.UniqueConstraint(
                fields=['cart', 'product', 'variant'],
                condition=models.Q(variant__isnull=False),
                name='unique_cart_product_variant',
            ),
            models.CheckConstraint(
                check=models.Q(quantity__gt=0),
                name='cart_item_quantity_positive',
            ),
        ]

    def __str__(self):
        return f"{self.product.name} × {self.quantity}"

    @property
    def total_price(self):
        price = self.product.price
        if self.variant:
            price += self.variant.price_adjustment
        return price * self.quantity


