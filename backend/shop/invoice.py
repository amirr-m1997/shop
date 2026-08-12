"""
PDF invoice generator using ReportLab.

Generates a professional, right-to-left (RTL) invoice PDF
with store branding, customer info, product list, and totals.
Returns raw PDF bytes — ready to attach to an email.
"""
import io
import logging
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from shop.jalali import format_jalali

logger = logging.getLogger('email')

# ── Font Registration ──────────────────────────────────────
# Attempt to register a Persian/Arabic-capable font.
# Falls back to Helvetica if no TTF is found.

_FONT_REGISTERED = False
_FONT_NAME = 'Helvetica'  # fallback


def _register_font():
    global _FONT_REGISTERED, _FONT_NAME
    if _FONT_REGISTERED:
        return _FONT_NAME

    import os
    from pathlib import Path

    font_dirs = [
        Path(__file__).resolve().parent.parent / 'static' / 'fonts',
        Path(__file__).resolve().parent.parent / 'static',
        Path('/usr/share/fonts'),
        Path('C:/Windows/Fonts'),
    ]

    font_candidates = [
        'Vazirmatn-Regular.ttf',
        'Vazirmatn-Bold.ttf',
        'IRANSans-Regular.ttf',
        'Tahoma.ttf',
        'Arial.ttf',
    ]

    for font_dir in font_dirs:
        if not font_dir.exists():
            continue
        for font_name in font_candidates:
            font_path = font_dir / font_name
            if font_path.exists():
                try:
                    pdfmetrics.registerFont(TTFont('PersianFont', str(font_path)))
                    _FONT_NAME = 'PersianFont'
                    _FONT_REGISTERED = True
                    return _FONT_NAME
                except Exception:
                    continue

    # If no font found, use built-in (no Persian support but won't crash)
    _FONT_REGISTERED = True
    return _FONT_NAME


# ── Colors ─────────────────────────────────────────────────
PRIMARY = colors.HexColor('#1a1a2e')
ACCENT = colors.HexColor('#e94560')
LIGHT_BG = colors.HexColor('#f8f9fa')
BORDER = colors.HexColor('#dee2e6')
TEXT_DARK = colors.HexColor('#212529')
TEXT_MUTED = colors.HexColor('#6c757d')


def _draw_header(c, width, store_name, store_phone, store_email):
    """Draw store header with logo area and contact info."""
    font = _register_font()

    # Header background
    c.setFillColor(PRIMARY)
    c.rect(0, A4[1] - 50 * mm, width, 50 * mm, fill=1, stroke=0)

    # Store name
    c.setFillColor(colors.white)
    c.setFont(font, 20)
    c.drawString(20 * mm, A4[1] - 20 * mm, store_name)

    # Contact info
    c.setFont(font, 9)
    c.setFillColor(colors.HexColor('#adb5bd'))
    if store_phone:
        c.drawString(20 * mm, A4[1] - 30 * mm, f'Tel: {store_phone}')
    if store_email:
        c.drawString(20 * mm, A4[1] - 37 * mm, f'Email: {store_email}')

    # Invoice title
    c.setFillColor(colors.white)
    c.setFont(font, 14)
    c.drawRightString(width - 20 * mm, A4[1] - 25 * mm, 'INVOICE / factura')


def _draw_customer_info(c, y, width, order, font):
    """Draw customer and order info section."""
    # Section header
    c.setFillColor(PRIMARY)
    c.setFont(font, 11)
    c.drawString(20 * mm, y, 'Customer Information')
    y -= 5 * mm

    c.setStrokeColor(ACCENT)
    c.setLineWidth(1.5)
    c.line(20 * mm, y, width - 20 * mm, y)
    y -= 7 * mm

    # Two-column layout
    c.setFillColor(TEXT_DARK)
    c.setFont(font, 9)

    left_x = 20 * mm
    right_x = width / 2 + 5 * mm

    # Customer info for guests or authenticated users
    if order.user_id:
        customer_name = order.user.get_full_name() or order.user.username
        customer_email = order.user.email or '—'
    else:
        customer_name = order.guest_email or 'مهمان'
        customer_email = order.guest_email or '—'

    info_left = [
        ('Name:', str(customer_name)),
        ('Email:', str(customer_email)),
        ('Phone:', str(order.shipping_address.phone if order.shipping_address else '—')),
    ]

    info_right = [
        ('Order No:', str(order.order_number)),
        ('Date:', format_jalali(order.created_at, with_time=True)),
        ('Status:', str(order.get_status_display())),
    ]

    for i, (label, value) in enumerate(info_left):
        c.setFillColor(TEXT_MUTED)
        c.drawString(left_x, y - i * 6 * mm, label)
        c.setFillColor(TEXT_DARK)
        c.drawString(left_x + 22 * mm, y - i * 6 * mm, value[:40])

    for i, (label, value) in enumerate(info_right):
        c.setFillColor(TEXT_MUTED)
        c.drawString(right_x, y - i * 6 * mm, label)
        c.setFillColor(TEXT_DARK)
        c.drawString(right_x + 25 * mm, y - i * 6 * mm, value[:40])

    # Shipping address
    if order.shipping_address:
        y -= 25 * mm
        c.setFillColor(TEXT_MUTED)
        c.setFont(font, 8)
        addr = order.shipping_address
        address_parts = [addr.address_line1]
        if addr.address_line2:
            address_parts.append(addr.address_line2)
        address_parts.extend([addr.city, addr.state, addr.postal_code])
        c.drawString(left_x, y, f'Shipping: {", ".join(address_parts)[:80]}')

    return y - 12 * mm


def _draw_product_table(c, y, width, items, font):
    """Draw product table with headers and rows."""
    # Table header
    c.setFillColor(PRIMARY)
    c.rect(20 * mm, y - 1 * mm, width - 40 * mm, 8 * mm, fill=1, stroke=0)

    c.setFillColor(colors.white)
    c.setFont(font, 8)

    col_x = {
        'num': 22 * mm,
        'name': 35 * mm,
        'qty': width - 85 * mm,
        'price': width - 65 * mm,
        'total': width - 40 * mm,
    }

    c.drawString(col_x['num'], y + 1.5 * mm, '#')
    c.drawString(col_x['name'], y + 1.5 * mm, 'Product')
    c.drawRightString(col_x['qty'] + 15 * mm, y + 1.5 * mm, 'Qty')
    c.drawRightString(col_x['price'] + 15 * mm, y + 1.5 * mm, 'Price')
    c.drawRightString(col_x['total'] + 10 * mm, y + 1.5 * mm, 'Total')

    y -= 10 * mm

    # Table rows
    c.setFont(font, 8)
    for idx, item in enumerate(items):
        # Alternating row background
        if idx % 2 == 0:
            c.setFillColor(LIGHT_BG)
            c.rect(20 * mm, y - 2 * mm, width - 40 * mm, 8 * mm, fill=1, stroke=0)

        c.setFillColor(TEXT_DARK)

        # Row number
        c.drawString(col_x['num'], y + 1 * mm, str(idx + 1))

        # Product name
        product_name = item.product.name if item.product else 'Deleted product'
        variant_info = ''
        if item.variant:
            parts = []
            if hasattr(item.variant, 'size') and item.variant.size:
                parts.append(str(item.variant.size.name))
            if hasattr(item.variant, 'color') and item.variant.color:
                parts.append(str(item.variant.color.name))
            if parts:
                variant_info = f' ({"/".join(parts)})'
        c.drawString(col_x['name'], y + 1 * mm, f'{product_name[:35]}{variant_info}')

        # Quantity
        c.drawRightString(col_x['qty'] + 15 * mm, y + 1 * mm, str(item.quantity))

        # Unit price
        c.drawRightString(col_x['price'] + 15 * mm, y + 1 * mm, f'{item.price:,.0f}')

        # Total
        c.drawRightString(col_x['total'] + 10 * mm, y + 1 * mm, f'{item.total_price:,.0f}')

        # Separator line
        c.setStrokeColor(BORDER)
        c.setLineWidth(0.3)
        c.line(20 * mm, y - 2 * mm, width - 20 * mm, y - 2 * mm)

        y -= 8 * mm

    return y


def _draw_totals(c, y, width, order, font):
    """Draw order totals section."""
    totals_x = width - 90 * mm
    label_x = totals_x
    value_x = width - 20 * mm

    c.setFont(font, 9)
    rows = [
        ('Subtotal:', f'{order.subtotal:,.0f} Tomans'),
        ('Shipping:', f'{order.shipping_cost:,.0f} Tomans' if order.shipping_cost else 'Free'),
    ]

    if order.discount > 0:
        rows.append(('Discount:', f'-{order.discount:,.0f} Tomans'))

    if order.tax > 0:
        rows.append(('Tax:', f'{order.tax:,.0f} Tomans'))

    for label, value in rows:
        c.setFillColor(TEXT_MUTED)
        c.drawString(label_x, y, label)
        c.setFillColor(TEXT_DARK)
        c.drawRightString(value_x, y, value)
        y -= 6 * mm

    # Total divider
    c.setStrokeColor(PRIMARY)
    c.setLineWidth(1.5)
    c.line(label_x, y + 2 * mm, value_x, y + 2 * mm)
    y -= 3 * mm

    # Grand total
    c.setFillColor(ACCENT)
    c.setFont(font, 12)
    c.drawString(label_x, y, 'Total:')
    c.drawRightString(value_x, y, f'{order.total:,.0f} Tomans')

    # Payment method
    y -= 8 * mm
    c.setFillColor(TEXT_MUTED)
    c.setFont(font, 8)
    payment_display = order.get_payment_method_display() if hasattr(order, 'get_payment_method_display') else order.payment_method
    c.drawString(label_x, y, f'Payment: {payment_display}')

    if order.payment_status:
        c.drawString(label_x, y - 5 * mm, f'Payment Status: {order.get_payment_status_display()}')

    return y - 15 * mm


def _draw_footer(c, width, store_name, font):
    """Draw invoice footer."""
    y = 25 * mm

    c.setStrokeColor(BORDER)
    c.setLineWidth(0.5)
    c.line(20 * mm, y + 5 * mm, width - 20 * mm, y + 5 * mm)

    c.setFillColor(TEXT_MUTED)
    c.setFont(font, 7)
    c.drawString(20 * mm, y, f'Thank you for your purchase! — {store_name}')
    c.drawRightString(width - 20 * mm, y, 'Generated automatically')


def generate_invoice_pdf(order):
    """
    Generate a PDF invoice for the given order.
    Returns raw PDF bytes.
    """
    from pages.models import ContactInfo

    try:
        contact = ContactInfo.objects.first()
    except Exception:
        contact = None

    store_name = getattr(contact, 'site_name', 'Fashion Store')
    store_phone = getattr(contact, 'phone1', '')
    store_email = getattr(contact, 'email1', '')

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    font = _register_font()

    # Draw sections
    _draw_header(c, width, store_name, store_phone, store_email)

    y = height - 58 * mm
    y = _draw_customer_info(c, y, width, order, font)

    items = order.items.select_related('product', 'variant__size', 'variant__color').all()
    y = _draw_product_table(c, y, width, items, font)

    y = _draw_totals(c, y, width, order, font)

    _draw_footer(c, width, store_name, font)

    c.save()
    pdf_bytes = buffer.getvalue()
    buffer.close()

    logger.info(
        '[invoice_generated] order=%s size=%d bytes',
        order.order_number, len(pdf_bytes),
    )
    return pdf_bytes
