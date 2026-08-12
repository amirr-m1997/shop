import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ShieldCheck, ShoppingBag, Sparkles, Truck, Wallet } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
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
              handlePlaceOrder={handlePlaceOrder}
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
    </div>
  );
};

export default CheckoutPage;
