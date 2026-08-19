"""Runtime-only Persian presentation helpers for the standard Django Admin."""

from django.contrib import admin
from django.db import models

from .jalali import jalali_date, jalali_datetime


MODEL_LABELS = {
    'accounts.UserProfile': ('پروفایل کاربر', 'پروفایل‌های کاربران'),
    'accounts.LoginHistory': ('تاریخچه ورود', 'تاریخچه ورودها'),
    'accounts.DeliveryAttempt': ('تلاش ارسال', 'تلاش‌های ارسال'),
    'products.Category': ('دسته‌بندی', 'دسته‌بندی‌ها'),
    'products.Brand': ('برند', 'برندها'),
    'products.Size': ('سایز', 'سایزها'),
    'products.Color': ('رنگ', 'رنگ‌ها'),
    'products.Fabric': ('جنس پارچه', 'جنس‌های پارچه'),
    'products.Product': ('محصول', 'محصولات'),
    'products.ProductImage': ('تصویر محصول', 'تصاویر محصولات'),
    'products.ImageVariantGeneration': ('تولید نسخه تصویر', 'تولید نسخه‌های تصویر'),
    'products.ProductVariant': ('واریانت محصول', 'واریانت‌های محصول'),
    'products.Review': ('نظر محصول', 'نظرات محصولات'),
    'products.SizeGuide': ('راهنمای سایز', 'راهنماهای سایز'),
    'products.HomepageSection': ('بخش صفحه اصلی', 'بخش‌های صفحه اصلی'),
    'products.Banner': ('بنر', 'بنرها'),
    'products.StyleLook': ('استایل روز', 'استایل‌های روز'),
    'products.Wishlist': ('علاقه‌مندی', 'علاقه‌مندی‌ها'),
    'cart.Cart': ('سبد خرید', 'سبدهای خرید'),
    'cart.CartItem': ('آیتم سبد خرید', 'آیتم‌های سبد خرید'),
    'orders.ShippingAddress': ('آدرس ارسال', 'آدرس‌های ارسال'),
    'orders.Order': ('سفارش', 'سفارش‌ها'),
    'orders.OrderItem': ('آیتم سفارش', 'آیتم‌های سفارش'),
    'orders.LegacyInventoryReconciliation': ('تطبیق موجودی قدیمی', 'تطبیق‌های موجودی قدیمی'),
    'orders.Coupon': ('کوپن تخفیف', 'کوپن‌های تخفیف'),
    'orders.CouponUsage': ('استفاده از کوپن', 'استفاده‌های کوپن'),
    'orders.WelcomeClaim': ('دریافت هدیه خوش‌آمدگویی', 'دریافت‌های هدیه خوش‌آمدگویی'),
    'payments.Payment': ('پرداخت', 'پرداخت‌ها'),
    'chat.Conversation': ('گفتگو', 'گفتگوها'),
    'chat.Block': ('مسدودسازی', 'مسدودسازی‌ها'),
    'chat.Message': ('پیام', 'پیام‌ها'),
    'chat.StyleRoomMessageRead': ('خواندن پیام اتاق استایل', 'خواندن پیام‌های اتاق استایل'),
    'chat.Notification': ('اعلان', 'اعلان‌ها'),
    'support.SupportDepartmentMembership': ('عضویت دپارتمان پشتیبانی', 'عضویت‌های دپارتمان پشتیبانی'),
    'support.SupportConversation': ('گفتگوی پشتیبانی', 'گفتگوهای پشتیبانی'),
    'support.SupportMessage': ('پیام پشتیبانی', 'پیام‌های پشتیبانی'),
    'style_rooms.StyleRoom': ('اتاق استایل', 'اتاق‌های استایل'),
    'style_rooms.StyleRoomMember': ('عضو اتاق', 'اعضای اتاق'),
    'style_rooms.StyleRoomItem': ('آیتم اتاق', 'آیتم‌های اتاق'),
    'style_rooms.StyleRoomEvent': ('رویداد اتاق', 'رویدادهای اتاق'),
    'loyalty.LoyaltyEventType': ('نوع رویداد باشگاه', 'انواع رویداد باشگاه'),
    'loyalty.LoyaltyRule': ('قانون امتیاز', 'قوانین امتیاز'),
    'loyalty.LoyaltyRedemptionRule': ('قانون دریافت پاداش', 'قوانین دریافت پاداش'),
    'loyalty.PurchaseRewardTier': ('سطح پاداش خرید', 'سطوح پاداش خرید'),
    'loyalty.LoyaltyAccount': ('حساب باشگاه مشتریان', 'حساب‌های باشگاه مشتریان'),
    'loyalty.LoyaltyTransaction': ('تراکنش امتیاز', 'تراکنش‌های امتیاز'),
    'loyalty.LoyaltyRedemption': ('دریافت پاداش', 'دریافت‌های پاداش'),
    'loyalty.ReferralAttribution': ('انتساب ارجاع', 'انتساب‌های ارجاع'),
    'personalization.EventWeight': ('وزن رویداد', 'وزن‌های رویداد'),
    'personalization.EventDecayPolicy': ('سیاست کاهش رویداد', 'سیاست‌های کاهش رویداد'),
    'personalization.BehaviorEvent': ('رویداد رفتاری', 'رویدادهای رفتاری'),
    'personalization.UserPreference': ('ترجیحات کاربر', 'ترجیحات کاربران'),
}

FIELD_LABELS = {
    'id': 'شناسه', 'user': 'کاربر', 'customer': 'مشتری', 'product': 'محصول',
    'variant': 'واریانت', 'order': 'سفارش', 'created_at': 'تاریخ ایجاد',
    'updated_at': 'تاریخ به‌روزرسانی', 'deleted_at': 'تاریخ حذف',
    'status': 'وضعیت', 'quantity': 'تعداد', 'price': 'قیمت', 'stock': 'موجودی',
    'description': 'توضیحات', 'assigned_agent': 'کارشناس مسئول', 'active': 'فعال',
    'is_active': 'فعال', 'is_read': 'خوانده شده', 'is_verified_purchase': 'خرید تأیید شده',
    'is_approved': 'تأیید شده', 'is_featured': 'ویژه', 'is_new_arrival': 'جدید',
    'is_trending': 'پرطرفدار', 'email': 'ایمیل', 'phone': 'شماره تماس',
    'first_name': 'نام', 'last_name': 'نام خانوادگی', 'username': 'نام کاربری',
    'role': 'نقش', 'title': 'عنوان', 'name': 'نام', 'slug': 'نامک',
    'notes': 'یادداشت', 'metadata': 'فراداده', 'help_text': 'راهنما',
}

CHOICE_LABELS = {
    'queued': 'در صف انتظار', 'sending': 'در حال ارسال', 'sent': 'ارسال شده',
    'failed': 'ناموفق', 'processing': 'در حال پردازش', 'ready': 'آماده',
    'pending': 'در انتظار', 'paid': 'پرداخت شده', 'unpaid': 'پرداخت نشده',
    'refunded': 'بازپرداخت شده', 'success': 'موفق', 'cancelled': 'لغو شده',
    'closed': 'بسته شده', 'assigned': 'اختصاص داده شده', 'support': 'پشتیبانی',
    'fashion_stylist': 'استایلیست مد', 'reward': 'پاداش', 'redemption': 'دریافت پاداش',
    'reversal': 'برگشت', 'adjustment': 'اصلاح دستی', 'available': 'قابل استفاده',
    'reserved': 'رزروشده برای خرید', 'consumed': 'مصرف شده', 'expired': 'منقضی شده',
    'created': 'ایجاد شده', 'landed': 'باز شده', 'claimed': 'دریافت شده',
    'verified': 'تأیید شده', 'product_view': 'مشاهده محصول', 'search': 'جستجو',
    'wishlist_add': 'افزودن به علاقه‌مندی', 'wishlist_remove': 'حذف از علاقه‌مندی',
    'cart_add': 'افزودن به سبد', 'cart_remove': 'حذف از سبد', 'purchase': 'خرید',
    'review': 'ثبت نظر', 'product_share': 'اشتراک‌گذاری محصول', 'gender': 'جنسیت',
    'category': 'دسته‌بندی', 'subcategory': 'زیر‌دسته', 'brand': 'برند',
    'fabric': 'جنس پارچه', 'color': 'رنگ', 'PRODUCT': 'موجودی محصول',
    'VARIANT': 'موجودی واریانت', 'LEGACY_UNKNOWN': 'منبع قدیمی نامشخص',
}


def _date_display(field_name, field):
    formatter = jalali_datetime if isinstance(field, models.DateTimeField) else jalali_date

    @admin.display(description=field.verbose_name, ordering=field_name)
    def display(obj):
        return formatter(getattr(obj, field_name, None))

    display.__name__ = f'admin_jalali_{field_name}'
    return display


def localize_admin_site(admin_site):
    """Localize registered model metadata at runtime; database fields stay unchanged."""
    for model, model_admin in admin_site._registry.items():
        labels = MODEL_LABELS.get(model._meta.label)
        if labels:
            model._meta.verbose_name, model._meta.verbose_name_plural = labels

        for field in model._meta.fields:
            if field.name in FIELD_LABELS and not str(field.verbose_name).strip().startswith(('نام', 'تاریخ', 'وضعیت', 'شماره', 'کد', 'مبلغ', 'آدرس', 'تصویر', 'واریانت', 'دسته', 'جنس', 'نوع', 'سطح', 'قیمت', 'تعداد', 'موجودی', 'فعال', 'عنوان', 'توضیحات', 'کاربر', 'محصول', 'سفارش', 'پرداخت', 'پیام', 'شناسه', 'عضو', 'رویداد', 'حساب', 'تراکنش', 'قانون', 'دریافت', 'انتساب', 'ترجیحات', 'وزن', 'سیاست')):
                field.verbose_name = FIELD_LABELS[field.name]
            if field.choices:
                field.choices = [(value, CHOICE_LABELS.get(str(value), label)) for value, label in field.choices]

        list_display = list(getattr(model_admin, 'list_display', ()))
        for index, item in enumerate(list_display):
            if isinstance(item, str):
                try:
                    field = model._meta.get_field(item)
                except Exception:
                    continue
                if isinstance(field, (models.DateField, models.DateTimeField)):
                    list_display[index] = _date_display(item, field)
        model_admin.list_display = tuple(list_display)
