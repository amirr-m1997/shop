import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ShieldCheck, ShoppingBag, Sparkles, Truck, UserPlus, Wallet } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/Dialog';
import PaymentLoadingOverlay from '../components/ui/PaymentLoadingOverlay';
import { useToast } from '../components/ui/use-toast';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { calcShipping, useShippingConfig } from '../lib/shipping';
import { SEO } from '../lib/seo';
import { EMAIL_INVALID_MSG, EMAIL_REGEX } from '../components/checkout/constants';
import { useCheckoutAddress } from '../hooks/useCheckoutAddress';
import { useCheckoutCoupon } from '../hooks/useCheckoutCoupon';
import { useCheckoutSubmit, validateCheckoutAddress } from '../hooks/useCheckoutSubmit';
import CheckoutReviewStep from '../components/checkout/CheckoutReviewStep';
import CheckoutShippingStep from '../components/checkout/CheckoutShippingStep';
import CheckoutPaymentStep from '../components/checkout/CheckoutPaymentStep';
import Stepper from '../components/checkout/Stepper';
import OrderSummary from '../components/checkout/OrderSummary';

/* ─── Empty Cart ─── */
const EmptyCheckout = ({ navigate }) => (
  <div className="flex min-h-[70vh] items-center justify-center">
    <EmptyState
      icon={ShoppingBag}
      badge="تسویه حساب"
      title="هنوز چیزی برای تسویه نیست"
      description="سبد خرید خالی است. محصولات منتخب را کشف کنید و وقتی آماده شدید، اینجا منتظرتان هستیم."
      primaryLabel="کشف محصولات"
      primaryOnClick={() => navigate('/products')}
      secondaryLabel="رفتن به سبد خرید"
      secondaryOnClick={() => navigate('/cart')}
    >
      <div className="mt-10 grid w-full max-w-sm grid-cols-3 gap-3">
        {[
          { icon: Truck, label: 'ارسال سریع' },
          { icon: ShieldCheck, label: 'خرید امن' },
          { icon: Sparkles, label: 'بسته‌بندی لوکس' },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="rounded-2xl border border-border/50 bg-card/60 p-3.5 shadow-sm backdrop-blur-md"
          >
            <Icon className="mx-auto mb-2 h-[18px] w-[18px] text-primary/70" />
            <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </EmptyState>
  </div>
);

/* ─── Main ─── */
const CheckoutPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cart, clearCart, coupon, removeCoupon, applyCoupon } = useCart();
  const { isAuthenticated } = useAuth();
  const { config: shippingConfig } = useShippingConfig();

  const [step, setStep] = useState(1);
  const [guestInfo, setGuestInfo] = useState({
    email: '',
    phone: '',
  });
  const [guestEmailError, setGuestEmailError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [orderNotes, setOrderNotes] = useState('');
  const [error, setError] = useState('');
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const { toast } = useToast();
  const {
    shippingAddresses,
    selectedAddress,
    setSelectedAddress,
    showAddressForm,
    setShowAddressForm,
    newAddress,
    addrLoading,
    handleAddressChange,
    addAddress,
  } = useCheckoutAddress(isAuthenticated);

  useCheckoutCoupon({
    initialCode: searchParams.get('coupon'),
    coupon,
    applyCoupon,
  });

  const handleGuestInfoChange = (e) => {
    const { name, value } = e.target;
    setGuestInfo((prev) => ({ ...prev, [name]: value }));
    if (name === 'email') setGuestEmailError('');
  };

  const handleAddAddress = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!newAddress.full_name || !newAddress.phone || !newAddress.address_line1 || !newAddress.city) {
      setError('لطفاً فیلدهای الزامی را تکمیل کنید');
      return;
    }

    try {
      await addAddress();
    } catch (err) {
      console.error('Error adding address:', err);
      setError(err.response?.data?.detail || 'خطا در ذخیره آدرس');
    }
  };

  const { loading, isSubmitting, handlePlaceOrder } = useCheckoutSubmit({
    isAuthenticated,
    selectedAddress,
    guestInfo,
    address: newAddress,
    paymentMethod,
    orderNotes,
    coupon,
    clearCart,
    removeCoupon,
    navigate,
    toast,
    setStep,
    setError,
    setGuestEmailError,
  });

  const validateAndContinue = () => {
    setError('');
    setGuestEmailError('');
    const validationError = validateCheckoutAddress({
      isAuthenticated,
      selectedAddress,
      guestInfo,
      address: newAddress,
    });
    if (validationError) {
      setError(validationError);
      if (!isAuthenticated && (!guestInfo.email?.trim() || !EMAIL_REGEX.test(guestInfo.email.trim()))) {
        setGuestEmailError(validationError === 'لطفاً ایمیل خود را برای پیگیری سفارش وارد کنید'
          ? 'لطفاً ایمیل خود را وارد کنید'
          : EMAIL_INVALID_MSG);
      }
      return;
    }
    setStep(3);
  };

  const requestPlaceOrder = () => {
    if (isAuthenticated) {
      handlePlaceOrder();
      return;
    }
    setShowGuestWarning(true);
  };

  const continueAsGuest = () => {
    setShowGuestWarning(false);
    handlePlaceOrder();
  };

  const createAccountFirst = () => {
    const params = new URLSearchParams({ next: '/checkout' });
    if (guestInfo.email.trim()) params.set('email', guestInfo.email.trim());
    navigate(`/register?${params.toString()}`);
  };

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="min-h-[70vh] bg-gradient-to-b from-muted/40 via-background to-background">
        <SEO title="تسویه حساب" noIndex />
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
      <SEO title="تسویه حساب" noIndex />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-fade-in-down">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">تکمیل خرید</h1>
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
            <CheckoutReviewStep step={step} cart={cart} setStep={setStep} />

            <CheckoutShippingStep
              step={step} error={error} addrLoading={addrLoading}
              isAuthenticated={isAuthenticated} guestEmailError={guestEmailError}
              guestInfo={guestInfo} handleGuestInfoChange={handleGuestInfoChange}
              newAddress={newAddress} handleAddressChange={handleAddressChange}
              shippingAddresses={shippingAddresses} showAddressForm={showAddressForm}
              selectedAddress={selectedAddress} setSelectedAddress={setSelectedAddress}
              setShowAddressForm={setShowAddressForm} setError={setError}
              handleAddAddress={handleAddAddress} setStep={setStep}
              validateAndContinue={validateAndContinue}
            />

            <CheckoutPaymentStep
              step={step} error={error} selectedAddrObj={selectedAddrObj}
              setStep={setStep} paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod} orderNotes={orderNotes}
              setOrderNotes={setOrderNotes} finalTotal={finalTotal}
              isSubmitting={isSubmitting} loading={loading}
              handlePlaceOrder={requestPlaceOrder}
            />

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

      {isSubmitting && <PaymentLoadingOverlay />}

      <Dialog open={showGuestWarning} onOpenChange={setShowGuestWarning}>
        <DialogContent className="max-w-xl overflow-hidden p-0" showCloseButton={!isSubmitting}>
          <div className="border-b border-amber-200/70 bg-gradient-to-l from-amber-500/15 via-orange-500/10 to-transparent px-5 py-5 sm:px-6">
            <DialogHeader className="space-y-3 text-right">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-300">توجه کاربر گرامی</p>
                  <DialogTitle className="mt-1 text-lg leading-7">ادامه خرید به‌صورت مهمان</DialogTitle>
                </div>
              </div>
              <DialogDescription className="sr-only">
                شرایط اتصال سفارش مهمان به حساب کاربری
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-4 px-5 py-1 text-sm leading-7 text-foreground/85 sm:px-6">
            <p>
              شما در حال ثبت سفارش به‌صورت مهمان هستید. پس از پرداخت، لطفاً برای دسترسی راحت‌تر
              به سفارش خود، در همین مرورگر حساب کاربری ایجاد کنید و ایمیل خود را تأیید نمایید.
            </p>
            <p>
              اتصال خودکار این سفارش به حساب شما فقط در صورتی انجام می‌شود که ثبت‌نام و تأیید
              ایمیل از همین مرورگر و همین نشست انجام شود.
            </p>
            <p className="rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
              در صورت پاک‌کردن اطلاعات مرورگر، استفاده از دستگاه یا مرورگر دیگر، یا عدم ایجاد
              حساب، ممکن است سفارش به‌صورت خودکار به حساب شما متصل نشود.
            </p>
          </div>

          <DialogFooter className="gap-2 border-t bg-muted/30 px-5 py-4 sm:flex-col sm:space-x-0 sm:px-6">
            <Button className="h-11 w-full rounded-xl" onClick={continueAsGuest}>
              متوجه شدم، ادامه به پرداخت
            </Button>
            <Button variant="outline" className="h-11 w-full rounded-xl" onClick={createAccountFirst}>
              <UserPlus className="ml-2 h-4 w-4" />
              ساخت حساب قبل از پرداخت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckoutPage;
