import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CreditCard, Truck, Check, MapPin, Package, ShoppingBag,
  ArrowLeft, ArrowRight, ShieldCheck, Sparkles, Wallet,
  Phone, Home, Plus, Loader2, Percent, X, CheckCircle2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useCart } from '../contexts/CartContext';
import { ordersAPI, paymentsAPI, cartAPI } from '../services/api';
import { formatPrice } from '../lib/formatPrice';
import { PLACEHOLDER_IMG } from '../lib/placeholders';
import { calcShipping, useShippingConfig } from '../lib/shipping';

const STEPS = [
  { id: 1, label: 'بررسی سفارش', icon: Package },
  { id: 2, label: 'آدرس ارسال', icon: MapPin },
  { id: 3, label: 'پرداخت', icon: Wallet },
];

const PAYMENT_METHODS = [
  {
    id: 'card',
    label: 'پرداخت آنلاین / کارت',
    desc: 'درگاه بانکی امن — پرداخت فوری',
    icon: CreditCard,
    accent: 'from-blue-500/15 to-cyan-500/10 border-blue-500/30',
    iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  },
  {
    id: 'cash_on_delivery',
    label: 'پرداخت در محل',
    desc: 'پرداخت هنگام تحویل سفارش',
    icon: Truck,
    accent: 'from-emerald-500/15 to-green-500/10 border-emerald-500/30',
    iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  },
];

/* ─── Progress Stepper ─── */
const Stepper = ({ step }) => (
  <div className="mb-8 animate-fade-in-down">
    <div className="flex items-center justify-between max-w-xl mx-auto">
      {STEPS.map((s, idx) => {
        const Icon = s.icon;
        const done = step > s.id;
        const active = step === s.id;
        return (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
              <div
                className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${
                  done
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/25'
                    : active
                      ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/25 scale-105'
                      : 'bg-muted/50 border-border text-muted-foreground'
                }`}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={`text-xs sm:text-sm font-semibold text-center leading-tight ${
                  active || done ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className="flex-1 max-w-[64px] sm:max-w-[96px] h-0.5 mx-1 sm:mx-2 mb-6 rounded-full overflow-hidden bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    step > s.id ? 'w-full bg-emerald-500' : 'w-0 bg-primary'
                  }`}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

/* ─── Order Summary Sidebar ─── */
const OrderSummary = ({ cart, subtotal, shipping, total, shippingConfig, coupon }) => {
  const shippingInfo = calcShipping(subtotal, shippingConfig);
  const { isFree, remaining, threshold, progress } = shippingInfo;
  const itemCount = cart.total_items || cart.items.length;
  const discount = coupon ? parseFloat(coupon.discount_amount) : 0;
  const finalTotal = total - discount;
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState(null);
  const { applyCoupon, removeCoupon, couponError: ctxCouponError, couponLoading: ctxCouponLoading } = useCart();

  const handleApply = async () => {
    if (!couponCode.trim()) return;
    try {
      await applyCoupon(couponCode.trim());
      setCouponError(null);
    } catch {
      // error handled by context
    }
  };

  const handleRemove = () => {
    removeCoupon();
    setCouponCode('');
    setCouponError(null);
  };

  return (
    <div className="lg:sticky lg:top-24 space-y-5 animate-fade-in-up" style={{ animationDelay: '0.08s' }}>
      <Card className="overflow-hidden border-0 shadow-lg shadow-primary/5 ring-1 ring-border">
        <div className="bg-gradient-to-l from-primary via-primary to-primary/90 text-primary-foreground px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-none">خلاصه سفارش</h2>
              <p className="text-xs opacity-80 mt-1.5">
                {itemCount.toLocaleString('fa-IR')} کالا
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          {/* Mini item list */}
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
            {cart.items.map((item) => (
              <div key={item.id} className="flex gap-3 items-center">
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-muted ring-1 ring-border/50 shrink-0">
                  <img
                    src={item.product.primary_image || PLACEHOLDER_IMG}
                    alt={item.product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium line-clamp-1">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    × {item.quantity.toLocaleString('fa-IR')}
                  </p>
                </div>
                <span className="text-xs font-semibold tabular-nums shrink-0">
                  {formatPrice(item.total_price)}
                </span>
              </div>
            ))}
          </div>

          {/* Free shipping mini bar */}
          <div className={`rounded-2xl p-4 text-sm ${
            isFree
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-500/10 text-amber-800 dark:text-amber-200'
          }`}>
            <div className="flex items-center gap-2 mb-2 font-semibold">
              {isFree ? <Sparkles className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
              {isFree
                ? 'ارسال رایگان'
                : `${formatPrice(remaining)} تا ارسال رایگان`}
            </div>
            <div className="h-2 rounded-full bg-background/60 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isFree ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {!isFree && (
              <p className="mt-2 opacity-80">
                از {formatPrice(threshold)} به بالا رایگان
              </p>
            )}
          </div>

          {/* Coupon input */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`relative flex-1 ${coupon ? 'opacity-50 pointer-events-none' : ''}`}>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                  placeholder="کد تخفیف"
                  className="w-full rounded-2xl border border-border/70 bg-background/80 px-4 py-3 pr-10 text-sm font-medium placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                />
                <Percent className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              </div>
              {coupon ? (
                <button
                  onClick={handleRemove}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-500 transition-all hover:bg-red-100 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleApply}
                  disabled={!couponCode.trim() || ctxCouponLoading}
                  className="h-11 shrink-0 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25 disabled:opacity-40 disabled:pointer-events-none"
                >
                  {ctxCouponLoading ? '...' : 'اعمال'}
                </button>
              )}
            </div>
            {(couponError || ctxCouponError) && (
              <p className="text-sm font-medium text-red-500 flex items-center gap-2 px-1">
                <X className="h-4 w-4" />
                {couponError || ctxCouponError}
              </p>
            )}
            {coupon && (
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>کد {coupon.code} · {coupon.discount_type === 'percentage' ? `${coupon.discount_value}٪` : `${Number(coupon.discount_value).toLocaleString('fa-IR')} تومان`} تخفیف</span>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">جمع کالاها</span>
              <span className="font-medium tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">هزینه ارسال</span>
              <span className={`font-medium tabular-nums ${isFree ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                {isFree ? 'رایگان' : formatPrice(shipping)}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  تخفیف
                </span>
                <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                  -{formatPrice(discount)}
                </span>
              </div>
            )}
            <div className="h-px bg-border/50" />
            <div className="flex justify-between text-sm font-bold">
              <span>مبلغ نهایی</span>
              <span className="text-primary tabular-nums">{formatPrice(finalTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* ─── Empty Cart ─── */
const EmptyCheckout = ({ navigate }) => (
  <div className="container mx-auto px-4 py-16 max-w-md text-center animate-fade-in-up">
    <div className="mx-auto mb-6 w-28 h-28 rounded-2xl bg-gradient-to-br from-muted to-muted/40 border flex items-center justify-center">
      <ShoppingBag className="h-12 w-12 text-muted-foreground/70" strokeWidth={1.25} />
    </div>
    <h2 className="text-2xl font-bold mb-2">سبد خرید خالی است</h2>
    <p className="text-muted-foreground mb-6">برای تکمیل خرید ابتدا محصولی به سبد اضافه کنید.</p>
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Button onClick={() => navigate('/products')} className="rounded-full px-6">
        مشاهده محصولات
      </Button>
      <Button variant="outline" onClick={() => navigate('/cart')} className="rounded-full px-6">
        رفتن به سبد خرید
      </Button>
    </div>
  </div>
);

/* ─── Main ─── */
const CheckoutPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cart, clearCart, coupon, removeCoupon, applyCoupon } = useCart();
  const { config: shippingConfig } = useShippingConfig();

  const [step, setStep] = useState(1);
  const [shippingAddresses, setShippingAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [orderNotes, setOrderNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addrLoading, setAddrLoading] = useState(true);

  useEffect(() => {
    fetchAddresses();
  }, []);

  useEffect(() => {
    const code = searchParams.get('coupon');
    if (code && !coupon) {
      applyCoupon(code).catch(() => {});
    }
  }, []);

  const fetchAddresses = async () => {
    setAddrLoading(true);
    try {
      const response = await ordersAPI.getShippingAddresses();
      const addresses = Array.isArray(response.data)
        ? response.data
        : (response.data.results || []);

      setShippingAddresses(addresses);

      if (addresses.length > 0) {
        const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
        setSelectedAddress(defaultAddr.id);
        setShowAddressForm(false);
      } else {
        setShowAddressForm(true);
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
      setShippingAddresses([]);
      setShowAddressForm(true);
    } finally {
      setAddrLoading(false);
    }
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setNewAddress((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddAddress = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!newAddress.full_name || !newAddress.phone || !newAddress.address_line1 || !newAddress.city) {
      setError('لطفاً فیلدهای الزامی را پر کنید');
      return;
    }

    try {
      await ordersAPI.createShippingAddress(newAddress);
      await fetchAddresses();
      setNewAddress({
        full_name: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
      });
      setShowAddressForm(false);
    } catch (err) {
      console.error('Error adding address:', err);
      setError(err.response?.data?.detail || 'خطا در ذخیره آدرس');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      setError('لطفاً یک آدرس ارسال را انتخاب کنید');
      setStep(2);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const orderRes = await ordersAPI.createOrder({
        shipping_address_id: selectedAddress,
        payment_method: paymentMethod,
        notes: orderNotes,
        coupon_code: coupon?.code || '',
      });
      const orderId = orderRes.data.id;

      if (paymentMethod === 'card') {
        try {
          const payRes = await paymentsAPI.initiate({ order_id: orderId });
          if (payRes.data.gateway_url) {
            window.location.href = payRes.data.gateway_url;
            return;
          }
        } catch (payErr) {
          console.error('Payment initiation error:', payErr);
          setError(payErr.response?.data?.error || payErr.response?.data?.detail || 'خطا در اتصال به درگاه پرداخت. سفارش ثبت شد و می‌توانید از پنل کاربری پرداخت کنید.');
          setLoading(false);
          return;
        }
      }

      await clearCart();
      removeCoupon();
      const expiresAt = orderRes.data.expires_at || '';
      navigate(`/order-success?order_number=${orderRes.data.order_number}&expires_at=${encodeURIComponent(expiresAt)}`);
    } catch (err) {
      console.error('Error placing order:', err);
      const data = err.response?.data;
      let msg = 'خطا در ثبت سفارش. لطفاً دوباره تلاش کنید.';
      if (typeof data === 'string') {
        msg = data;
      } else if (data?.error) {
        msg = data.error;
      } else if (data?.detail) {
        msg = data.detail;
      } else if (data && typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const firstVal = data[firstKey];
        if (Array.isArray(firstVal)) {
          msg = firstVal[0] || msg;
        } else if (typeof firstVal === 'string') {
          msg = firstVal;
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="min-h-[70vh] bg-gradient-to-b from-muted/40 via-background to-background">
        <EmptyCheckout navigate={navigate} />
      </div>
    );
  }

  const subtotal = parseFloat(cart.total_price) || 0;
  const shippingInfo = calcShipping(subtotal, shippingConfig);
  const total = subtotal + shippingInfo.shipping;
  const discount = coupon ? parseFloat(coupon.discount_amount) : 0;
  const finalTotal = total - discount;
  const selectedAddrObj = shippingAddresses.find((a) => a.id === selectedAddress);

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-muted/40 via-background to-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-fade-in-down">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">تکمیل خرید</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                مرحله {step.toLocaleString('fa-IR')} از ۳
              </p>
            </div>
          </div>
          <Link
            to="/cart"
            className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <ArrowRight className="h-4 w-4" />
            <span>بازگشت به سبد</span>
          </Link>
        </div>

        <Stepper step={step} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main steps */}
          <div className="lg:col-span-2 space-y-4 animate-fade-in-up">
            {/* ── Step 1: Review ── */}
            {step === 1 && (
              <Card className="overflow-hidden border shadow-sm">
                <div className="px-5 sm:px-6 py-4 border-b bg-gradient-to-l from-primary/5 to-transparent flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">بررسی سفارش</h2>
                    <p className="text-xs text-muted-foreground">محصولات سبد خود را یک‌بار دیگر چک کنید</p>
                  </div>
                </div>
                <CardContent className="p-5 sm:p-6">
                  <div className="space-y-3">
                    {cart.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-4 p-3 sm:p-4 rounded-2xl border bg-card hover:border-primary/20 hover:shadow-sm transition-all"
                      >
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-muted ring-1 ring-border/50 shrink-0">
                          <img
                            src={item.product.primary_image || PLACEHOLDER_IMG}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h3 className="font-semibold text-sm sm:text-base line-clamp-2">
                            {item.product.name}
                          </h3>
                          {item.variant && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-secondary font-medium">
                                سایز: {item.variant.size_name}
                              </span>
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-secondary font-medium">
                                رنگ: {item.variant.color_name}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              تعداد: {item.quantity.toLocaleString('fa-IR')}
                            </span>
                            <span className="font-bold tabular-nums">{formatPrice(item.total_price)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    size="lg"
                    className="w-full mt-6 rounded-xl h-12 font-bold shadow-md hover:shadow-lg transition-all"
                    onClick={() => setStep(2)}
                  >
                    ادامه — آدرس ارسال
                    <ArrowLeft className="mr-2 h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ── Step 2: Shipping ── */}
            {step === 2 && (
              <Card className="overflow-hidden border shadow-sm">
                <div className="px-5 sm:px-6 py-4 border-b bg-gradient-to-l from-blue-500/5 to-transparent flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">آدرس ارسال</h2>
                    <p className="text-xs text-muted-foreground">محل تحویل سفارش را انتخاب کنید</p>
                  </div>
                </div>
                <CardContent className="p-5 sm:p-6">
                  {error && (
                    <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-xl mb-4 text-sm">
                      {error}
                    </div>
                  )}

                  {addrLoading ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">در حال بارگذاری آدرس‌ها...</span>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 mb-5">
                        {shippingAddresses.map((address) => {
                          const selected = selectedAddress === address.id;
                          return (
                            <button
                              type="button"
                              key={address.id}
                              onClick={() => setSelectedAddress(address.id)}
                              className={`w-full text-right p-4 rounded-2xl border-2 transition-all ${
                                selected
                                  ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                                  : 'border-border hover:border-primary/30 hover:bg-muted/40'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                    selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                                  }`}
                                >
                                  {selected && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-sm">{address.full_name}</p>
                                    {address.is_default && (
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                        پیش‌فرض
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {address.phone}
                                  </p>
                                  <p className="text-sm mt-1.5 leading-relaxed flex items-start gap-1">
                                    <Home className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                                    <span>
                                      {address.address_line1}
                                      {address.address_line2 && `، ${address.address_line2}`}
                                      {(address.city || address.state) && (
                                        <>
                                          <br />
                                          {[address.city, address.state].filter(Boolean).join('، ')}
                                          {address.postal_code && ` — کد پستی: ${address.postal_code}`}
                                        </>
                                      )}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {!showAddressForm ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full rounded-xl border-dashed h-11 mb-5"
                          onClick={() => setShowAddressForm(true)}
                        >
                          <Plus className="ml-2 h-4 w-4" />
                          افزودن آدرس جدید
                        </Button>
                      ) : (
                        <div className="rounded-2xl border bg-muted/20 p-4 sm:p-5 mb-5">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              آدرس جدید
                            </h3>
                            {shippingAddresses.length > 0 && (
                              <button
                                type="button"
                                className="text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setShowAddressForm(false);
                                  setError('');
                                }}
                              >
                                بستن
                              </button>
                            )}
                          </div>
                          <form onSubmit={handleAddAddress} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input
                              name="full_name"
                              placeholder="نام و نام خانوادگی *"
                              value={newAddress.full_name}
                              onChange={handleAddressChange}
                              className="md:col-span-2 rounded-xl"
                            />
                            <Input
                              name="phone"
                              placeholder="شماره تماس *"
                              value={newAddress.phone}
                              onChange={handleAddressChange}
                              className="rounded-xl"
                            />
                            <Input
                              name="city"
                              placeholder="شهر *"
                              value={newAddress.city}
                              onChange={handleAddressChange}
                              className="rounded-xl"
                            />
                            <Input
                              name="address_line1"
                              placeholder="آدرس اصلی (خیابان، کوچه، پلاک) *"
                              value={newAddress.address_line1}
                              onChange={handleAddressChange}
                              className="md:col-span-2 rounded-xl"
                            />
                            <Input
                              name="address_line2"
                              placeholder="آدرس تکمیلی (واحد، طبقه) — اختیاری"
                              value={newAddress.address_line2}
                              onChange={handleAddressChange}
                              className="md:col-span-2 rounded-xl"
                            />
                            <Input
                              name="state"
                              placeholder="استان"
                              value={newAddress.state}
                              onChange={handleAddressChange}
                              className="rounded-xl"
                            />
                            <Input
                              name="postal_code"
                              placeholder="کد پستی"
                              value={newAddress.postal_code}
                              onChange={handleAddressChange}
                              className="rounded-xl"
                            />
                            <Button type="submit" className="md:col-span-2 rounded-xl mt-1">
                              ذخیره آدرس
                            </Button>
                          </form>
                        </div>
                      )}

                      <div className="flex flex-col-reverse sm:flex-row gap-3">
                        <Button
                          variant="outline"
                          className="rounded-xl sm:w-auto"
                          onClick={() => setStep(1)}
                        >
                          <ArrowRight className="ml-2 h-4 w-4" />
                          بازگشت
                        </Button>
                        <Button
                          size="lg"
                          className="flex-1 rounded-xl h-12 font-bold shadow-md"
                          onClick={() => {
                            setError('');
                            setStep(3);
                          }}
                          disabled={!selectedAddress}
                        >
                          ادامه — روش پرداخت
                          <ArrowLeft className="mr-2 h-5 w-5" />
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Step 3: Payment ── */}
            {step === 3 && (
              <Card className="overflow-hidden border shadow-sm">
                <div className="px-5 sm:px-6 py-4 border-b bg-gradient-to-l from-violet-500/5 to-transparent flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">روش پرداخت</h2>
                    <p className="text-xs text-muted-foreground">نحوه پرداخت را انتخاب کنید</p>
                  </div>
                </div>
                <CardContent className="p-5 sm:p-6">
                  {error && (
                    <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-xl mb-4 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Selected address recap */}
                  {selectedAddrObj && (
                    <div className="rounded-2xl border bg-muted/30 p-4 mb-5 flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground font-medium">ارسال به</p>
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => setStep(2)}
                          >
                            تغییر
                          </button>
                        </div>
                        <p className="font-semibold text-sm mt-0.5">{selectedAddrObj.full_name}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {selectedAddrObj.address_line1}
                          {selectedAddrObj.city && ` — ${selectedAddrObj.city}`}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = method.icon;
                      const selected = paymentMethod === method.id;
                      return (
                        <button
                          type="button"
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id)}
                          className={`w-full text-right p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                            selected
                              ? `bg-gradient-to-l ${method.accent} shadow-sm`
                              : 'border-border hover:border-primary/30 hover:bg-muted/40'
                          }`}
                        >
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${method.iconBg}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm sm:text-base">{method.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{method.desc}</p>
                          </div>
                          <div
                            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                            }`}
                          >
                            {selected && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5">
                    <label className="block text-sm font-medium mb-2">یادداشت سفارش (اختیاری)</label>
                    <textarea
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                      placeholder="هر نکته یا توضیحی درباره سفارش خود دارید بنویسید..."
                    />
                  </div>

                  {/* Pay amount highlight */}
                  <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">مبلغ نهایی</span>
                    <span className="text-xl font-black tabular-nums text-primary">
                      {formatPrice(finalTotal > 0 ? finalTotal : 0)}
                    </span>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
                    <Button
                      variant="outline"
                      className="rounded-xl sm:w-auto"
                      onClick={() => setStep(2)}
                      disabled={loading}
                    >
                      <ArrowRight className="ml-2 h-4 w-4" />
                      بازگشت
                    </Button>
                    <Button
                      size="lg"
                      className="flex-1 rounded-xl h-12 font-bold shadow-md hover:shadow-lg transition-all"
                      onClick={handlePlaceOrder}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                          در حال ثبت سفارش...
                        </>
                      ) : (
                        <>
                          <Check className="ml-2 h-5 w-5" />
                          ثبت نهایی سفارش
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <OrderSummary
            cart={cart}
            subtotal={subtotal}
            shipping={shippingInfo.shipping}
            total={total}
            shippingConfig={shippingConfig}
            coupon={coupon}
          />
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
