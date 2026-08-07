import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Mail, Lock, Save, Plus, Trash2, MapPin, Phone,
  Package, LogOut, Calendar, Eye, EyeOff, AlertTriangle,
  CheckCircle, Pencil, Shield, Cake, ShoppingCart, Heart,
  ChevronLeft, X, BadgeCheck, AlertCircle, Sparkles,
  ShieldCheck, Star, History, Monitor, Globe, HeartOff, MapPinOff, MessageCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription
} from '../components/ui/Dialog';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { authAPI } from '../services/api';
import { formatPrice } from '../lib/formatPrice';
import { SEO } from '../lib/seo';
import { formatDate } from '../lib/formatDate';
import { JalaliDatePicker, toJalaliString } from '../components/ui/JalaliDatePicker';
import Skeleton from '../components/ui/Skeleton';
import { PLACEHOLDER_IMG } from '../lib/placeholders';

/* ─── Ambient Background ─── */
const AmbientBg = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
    <div className="absolute -top-40 left-1/4 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-primary/[0.05] blur-3xl dark:bg-primary/[0.08]" />
    <div className="absolute top-1/2 -right-20 h-80 w-80 rounded-full bg-violet-500/[0.05] blur-3xl dark:bg-violet-400/[0.07]" />
    <div className="absolute bottom-20 left-10 h-64 w-64 rounded-full bg-blue-500/[0.04] blur-3xl" />
    <div
      className="absolute inset-0 opacity-[0.3] dark:opacity-[0.12]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.035) 1px, transparent 0)',
        backgroundSize: '26px 26px',
      }}
    />
  </div>
);

/* ─── Circular Progress ─── */
const CompletionRing = ({ percent, size = 56, stroke = 4 }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/80"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#profileRingGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
        <defs>
          <linearGradient id="profileRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
       <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums">
         {percent.toLocaleString('fa-IR')}٪
       </span>
    </div>
  );
};

/* ─── Premium Field ─── */
const Field = ({ label, icon: Icon, children, hint }) => (
  <div className="group/field space-y-2">
    <label className="flex items-center gap-2 text-sm font-semibold text-foreground/90">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

/* ─── Alert chips ─── */
const SuccessAlert = ({ children }) => (
  <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300 animate-fade-in">
    <CheckCircle className="h-4 w-4 shrink-0" />
    {children}
  </div>
);

const ErrorAlert = ({ children }) => (
  <div className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-fade-in">
    {children}
  </div>
);

/* ─── Section Card shell ─── */
const SectionCard = ({ children, className = '', delay = 0 }) => (
  <section
    className={`overflow-hidden rounded-3xl border border-border/50 bg-card/80 shadow-sm shadow-black/[0.03] backdrop-blur-xl ring-1 ring-black/[0.02] transition-all duration-500 hover:shadow-lg hover:shadow-primary/[0.04] dark:ring-white/[0.03] animate-fade-in-up ${className}`}
    style={{ animationDelay: `${delay}s` }}
  >
    {children}
  </section>
);

const SectionHead = ({ icon: Icon, title, action, tone = 'from-primary/15 to-violet-500/10 text-primary' }) => (
  <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-gradient-to-l from-muted/40 via-transparent to-transparent px-5 py-4 sm:px-6">
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tone}`}>
        <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
      </div>
      <h2 className="text-base font-bold tracking-tight sm:text-lg">{title}</h2>
    </div>
    {action}
  </div>
);

/* ─── Greeting helper ─── */
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'صبح بخیر';
  if (h < 17) return 'ظهر بخیر';
  if (h < 21) return 'عصر بخیر';
  return 'شب بخیر';
};

/* ─── Main ─── */
const ProfilePage = () => {
  const { user, isAuthenticated, updateProfile, changePassword, logout } = useAuth();
  const { cart } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();
  const navigate = useNavigate();

  /* ── Profile ── */
  const [profileForm, setProfileForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', date_of_birth: '',
  });
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  /* ── Password ── */
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  /* ── Verification ── */
  const [verifyType, setVerifyType] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyMsg, setVerifyMsg] = useState('');
  const [verifyErr, setVerifyErr] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyCodeDev, setVerifyCodeDev] = useState('');

  /* ── Addresses ── */
  const [addresses, setAddresses] = useState([]);
  const [addrLoading, setAddrLoading] = useState(true);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editingAddr, setEditingAddr] = useState(null);
  const [addrForm, setAddrForm] = useState({
    full_name: '', phone: '', address_line1: '', address_line2: '',
    city: '', state: '', postal_code: '', is_default: false,
  });
  const [addrErr, setAddrErr] = useState('');

  /* ── Dialogs ── */
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [pwSectionOpen, setPwSectionOpen] = useState(false);
  const [deleteAddrOpen, setDeleteAddrOpen] = useState(false);
  const [deleteAddrId, setDeleteAddrId] = useState(null);

  /* ── Login History ── */
  const [loginHistory, setLoginHistory] = useState([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(false);
  const [loginHistoryOpen, setLoginHistoryOpen] = useState(false);

  /* ── Profile completion ── */
  const completionPercent = useMemo(() => {
    if (!user) return 0;
    let filled = 0;
    const total = 6;
    if (user.username) filled++;
    if (user.email) filled++;
    if (user.first_name) filled++;
    if (user.last_name) filled++;
    if (user.phone) filled++;
    if (user.date_of_birth) filled++;
    return Math.round((filled / total) * 100);
  }, [user]);

  const initials = useMemo(() => {
    const f = user?.first_name?.[0] || '';
    const l = user?.last_name?.[0] || '';
    return (f + l).toUpperCase() || user?.username?.[0]?.toUpperCase() || '?';
  }, [user]);

  const displayName = useMemo(() => {
    if (user?.first_name && user?.last_name) return `${user.first_name} ${user.last_name}`;
    return user?.username || 'کاربر';
  }, [user]);

  const greeting = useMemo(() => getGreeting(), []);

  /* ── Load data ── */
  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (user) {
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        date_of_birth: user.date_of_birth || '',
      });
    }
  }, [user, isAuthenticated, navigate]);

  useEffect(() => { if (isAuthenticated) loadAddresses(); }, [isAuthenticated]);

  const loadAddresses = async () => {
    setAddrLoading(true);
    try { const res = await authAPI.getAddresses(); setAddresses(res.data); } catch {} finally { setAddrLoading(false); }
  };

  const loadLoginHistory = async () => {
    setLoginHistoryLoading(true);
    try {
      const res = await authAPI.getLoginHistory();
      setLoginHistory(res.data);
    } catch {} finally {
      setLoginHistoryLoading(false);
    }
  };

  /* ── Profile update ── */
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileErr(''); setProfileMsg(''); setProfileLoading(true);
    try {
      await updateProfile(profileForm);
      setProfileMsg('تغییرات با موفقیت ذخیره شد');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err) { setProfileErr(err.message); }
    finally { setProfileLoading(false); }
  };

  /* ── Password change ── */
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwErr(''); setPwMsg('');
    if (newPassword !== confirmPassword) { setPwErr('رمز عبور جدید و تکرار آن مطابقت ندارند'); return; }
    if (newPassword.length < 6) { setPwErr('رمز عبور جدید باید حداقل ۶ کاراکتر باشد'); return; }
    setPwLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      setPwMsg('رمز عبور با موفقیت تغییر کرد');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => setPwMsg(''), 3000);
    } catch (err) { setPwErr(err.message); }
    finally { setPwLoading(false); }
  };

  /* ── Verification ── */
  const handleSendVerification = async (type) => {
    setVerifyType(type); setVerifyErr(''); setVerifyMsg(''); setVerifyCode(''); setVerifyCodeDev('');
    setVerifyLoading(true);
    try {
      const res = await authAPI.sendVerification({ type });
      setVerifyMsg(res.data.message);
      if (res.data.code) setVerifyCodeDev(res.data.code);
    } catch (err) { setVerifyErr(err.response?.data?.error || 'خطا در ارسال کد'); }
    finally { setVerifyLoading(false); }
  };

  const handleVerifyCode = async () => {
    setVerifyErr(''); setVerifyMsg(''); setVerifyLoading(true);
    try {
      await authAPI.verifyCode({ code: verifyCode, type: verifyType });
      setVerifyMsg(`${verifyType === 'phone' ? 'تلفن' : 'ایمیل'} با موفقیت تأیید شد`);
      setVerifyCode(''); setVerifyCodeDev('');
      await authAPI.getUser();
      setTimeout(() => { setVerifyType(''); setVerifyMsg(''); }, 2000);
    } catch (err) { setVerifyErr(err.response?.data?.error || 'کد اشتباه است'); }
    finally { setVerifyLoading(false); }
  };

  /* ── Address CRUD ── */
  const resetAddrForm = () => {
    setAddrForm({ full_name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', postal_code: '', is_default: false });
    setEditingAddr(null); setAddrErr('');
  };
  const openAddAddress = () => { resetAddrForm(); setShowAddrForm(true); };
  const openEditAddress = (addr) => {
    setAddrForm({ full_name: addr.full_name, phone: addr.phone, address_line1: addr.address_line1, address_line2: addr.address_line2 || '', city: addr.city, state: addr.state, postal_code: addr.postal_code, is_default: addr.is_default });
    setEditingAddr(addr.id); setShowAddrForm(true); setAddrErr('');
  };
  const handleAddressSubmit = async (e) => {
    e.preventDefault(); setAddrErr('');
    if (!addrForm.full_name || !addrForm.phone || !addrForm.address_line1 || !addrForm.city) { setAddrErr('لطفاً فیلدهای الزامی را پر کنید'); return; }
    try {
      if (editingAddr) await authAPI.updateAddress(editingAddr, addrForm);
      else await authAPI.createAddress(addrForm);
      setShowAddrForm(false); resetAddrForm(); loadAddresses();
    } catch (err) { setAddrErr(err.response?.data?.error || 'خطا در ذخیره آدرس'); }
  };
  const handleDeleteAddress = async (id) => {
    setDeleteAddrId(id);
    setDeleteAddrOpen(true);
  };

  const confirmDeleteAddress = async () => {
    if (!deleteAddrId) return;
    try { await authAPI.deleteAddress(deleteAddrId); loadAddresses(); } catch {}
    setDeleteAddrOpen(false);
    setDeleteAddrId(null);
  };

  const handleLogout = async () => { await logout(); setLogoutOpen(false); navigate('/'); };

  if (!isAuthenticated) return null;

  const inputClass =
    'h-11 rounded-xl border-border/60 bg-background/80 shadow-sm transition-all duration-300 focus-visible:border-primary/40 focus-visible:ring-primary/20';

  return (
    <div className="relative min-h-screen">
      <SEO title="پروفایل" noIndex />
      <AmbientBg />

      <div className="container relative mx-auto max-w-5xl px-4 py-6 sm:py-10">

        {/* ── Hero Header ── */}
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-border/50 bg-card/70 shadow-xl shadow-primary/[0.06] backdrop-blur-xl ring-1 ring-black/[0.02] dark:ring-white/[0.04] animate-fade-in-down">
          {/* Mesh gradient layer */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-primary/[0.12] via-violet-500/[0.05] to-transparent" />
          <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-10 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
            {/* Avatar */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-primary via-violet-500 to-blue-500 opacity-70 blur-[2px] transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/85 text-3xl font-black text-primary-foreground shadow-2xl shadow-primary/30 ring-4 ring-background sm:h-28 sm:w-28 sm:text-4xl transition-transform duration-500 group-hover:scale-[1.02]">
                {initials}
              </div>
              {(user?.phone_verified || user?.email_verified) && (
                <div className="absolute -bottom-1 -left-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-background">
                  <BadgeCheck className="h-4 w-4" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1 text-center sm:text-right">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">
                 {greeting} ✨
               </p>
               <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
                 {displayName}
               </h1>
               <p className="mt-2 text-sm text-muted-foreground" dir="ltr">
                {user?.email}
              </p>

               <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                 {user?.phone && (
                   <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm">
                     <Phone className="h-4 w-4 text-primary/70" />
                     <span dir="ltr">{user.phone}</span>
                   </span>
                 )}
                 {user?.date_of_birth && (
                   <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm">
                     <Cake className="h-4 w-4 text-rose-500/80" />
                     {toJalaliString(user.date_of_birth)}
                   </span>
                 )}
                 {user?.date_joined && (
                   <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm">
                     <Calendar className="h-4 w-4 text-blue-500/80" />
                     عضو از {formatDate(user.date_joined)}
                   </span>
                 )}
               </div>
            </div>

            {/* Completion + actions */}
            <div className="flex flex-col items-center gap-3 sm:items-end">
               <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/60 px-4 py-3 shadow-sm backdrop-blur-md">
                 <CompletionRing percent={completionPercent} />
                 <div className="text-right">
                   <p className="text-xs font-medium text-muted-foreground">تکمیل پروفایل</p>
                   <p className="text-sm font-bold">
                     {completionPercent === 100 ? 'کامل شد' : 'در حال تکمیل'}
                   </p>
                 </div>
               </div>

              <div className="flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl border-border/60 bg-background/60 shadow-sm backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-md"
                >
                     <Link to="/orders" className="flex items-center gap-2">
                       <Package className="h-4 w-4" />
                       سفارش‌ها
                     </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl border-border/60 bg-background/60 shadow-sm backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-md"
                >
                     <Link to="/cart" className="flex items-center gap-2">
                       <ShoppingCart className="h-4 w-4" />
                       سبد ({(cart?.total_items || 0).toLocaleString('fa-IR')})
                     </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Completion bar strip */}
          {completionPercent < 100 && (
            <div className="relative border-t border-border/40 bg-muted/20 px-6 py-3">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">
                  {completionPercent < 40
                    ? 'پروفایل خود را تکمیل کنید تا تجربه بهتری داشته باشید'
                    : 'تقریباً تمام شد! فقط کمی دیگر'}
                </span>
                <span className="font-bold text-primary tabular-nums">
                  {completionPercent.toLocaleString('fa-IR')}٪
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-primary via-violet-500 to-blue-500 transition-all duration-700"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Verification Banner ── */}
        {(!user?.phone_verified && !user?.email_verified) && (
          <div className="mb-6 overflow-hidden rounded-[1.35rem] border border-amber-500/25 bg-gradient-to-l from-amber-500/[0.12] via-amber-500/[0.05] to-transparent p-4 shadow-sm backdrop-blur-sm sm:p-5 animate-fade-in-up">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">حساب خود را تأیید کنید</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  برای خرید امن، لطفاً شماره تلفن یا ایمیل خود را تأیید کنید
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {user?.phone && !user?.phone_verified && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendVerification('phone')}
                    disabled={verifyLoading}
                    className="h-9 rounded-xl border-amber-500/30 bg-background/70 shadow-sm"
                  >
                    <Phone className="ml-1 h-3.5 w-3.5" />
                    تأیید تلفن
                  </Button>
                )}
                {user?.email && !user?.email_verified && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendVerification('email')}
                    disabled={verifyLoading}
                    className="h-9 rounded-xl border-amber-500/30 bg-background/70 shadow-sm"
                  >
                    <Mail className="ml-1 h-3.5 w-3.5" />
                    تأیید ایمیل
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Verification Code Input ── */}
        {verifyType && (
          <SectionCard className="mb-6 border-primary/20" delay={0.05}>
            <div className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold">
                  تأیید {verifyType === 'phone' ? 'تلفن' : 'ایمیل'}
                </p>
              </div>
              {verifyMsg && <SuccessAlert>{verifyMsg}</SuccessAlert>}
              {verifyErr && <ErrorAlert>{verifyErr}</ErrorAlert>}
              {verifyCodeDev && (
                <p className="mb-3 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground" dir="ltr">
                  Dev code: {verifyCodeDev}
                </p>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="کد ۶ رقمی را وارد کنید"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  maxLength={6}
                  className={`flex-1 text-center text-lg font-bold tracking-widest ${inputClass}`}
                  dir="ltr"
                />
                <Button
                  onClick={handleVerifyCode}
                  disabled={verifyLoading || verifyCode.length !== 6}
                  className="h-11 rounded-xl px-6 font-bold shadow-md shadow-primary/15"
                >
                  تأیید
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-xl"
                  onClick={() => { setVerifyType(''); setVerifyCode(''); setVerifyCodeDev(''); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SectionCard>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ── Left Column ── */}
          <div className="space-y-6 lg:col-span-2">
            {/* ── Style Chat ── */}
            <SectionCard delay={0.02}>
              <Link to="/chat" className="group flex flex-col gap-4 p-5 sm:p-6 sm:flex-row sm:items-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-lg shadow-primary/20 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                  <MessageCircle className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-base font-bold">
                    استایل چت
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">جدید</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    با دوستان خود گفتگو کنید و محصولات موردعلاقه‌تان را به اشتراک بگذارید.
                  </p>
                </div>
                <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground transition-all duration-300 group-hover:-translate-x-1 group-hover:text-primary" />
              </Link>
            </SectionCard>

            {/* ── Personal Info ── */}
            <SectionCard delay={0.08}>
              <SectionHead icon={User} title="اطلاعات شخصی" />
              <div className="p-5 sm:p-6">
                {profileMsg && <SuccessAlert>{profileMsg}</SuccessAlert>}
                {profileErr && <ErrorAlert>{profileErr}</ErrorAlert>}

                <form onSubmit={handleProfileSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="نام">
                      <Input
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                        placeholder="نام"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="نام خانوادگی">
                      <Input
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                        placeholder="نام خانوادگی"
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <Field label="نام کاربری" hint="نام کاربری قابل تغییر نیست">
                    <Input value={user?.username || ''} disabled className={`${inputClass} bg-muted/60`} />
                  </Field>

                  <Field label="ایمیل" icon={Mail}>
                    <div className="relative">
                      <Mail className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                      <Input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        className={`${inputClass} pr-11`}
                        placeholder="ایمیل"
                        dir="ltr"
                      />
                    </div>
                  </Field>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="شماره تلفن" icon={Phone}>
                      <div className="relative">
                        <Phone className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                        <Input
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          className={`${inputClass} pr-11`}
                          placeholder="09121234567"
                          dir="ltr"
                        />
                      </div>
                    </Field>
                    <Field label="تاریخ تولد" icon={Cake}>
                      <JalaliDatePicker
                        value={profileForm.date_of_birth}
                        onChange={(gDate) => setProfileForm({ ...profileForm, date_of_birth: gDate })}
                        placeholder="تاریخ تولد"
                      />
                      {profileForm.date_of_birth && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {toJalaliString(profileForm.date_of_birth)}
                        </p>
                      )}
                    </Field>
                  </div>

                  <Button
                    type="submit"
                    disabled={profileLoading}
                    className="h-11 rounded-xl px-6 font-bold shadow-md shadow-primary/15 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <Save className="ml-2 h-4 w-4" />
                    {profileLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                  </Button>
                </form>
              </div>
            </SectionCard>

            {/* ── Password ── */}
            <SectionCard delay={0.12}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 border-b border-border/40 bg-gradient-to-l from-muted/40 via-transparent to-transparent px-5 py-4 text-right transition-colors hover:bg-muted/20 sm:px-6"
                onClick={() => setPwSectionOpen(!pwSectionOpen)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/15 to-amber-500/10 text-orange-600 dark:text-orange-400">
                    <Lock className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold tracking-tight sm:text-lg">تغییر رمز عبور</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">امنیت حساب خود را مدیریت کنید</p>
                  </div>
                </div>
                <ChevronLeft
                  className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
                    pwSectionOpen ? 'rotate-90' : ''
                  }`}
                />
              </button>

              <div
                className={`grid transition-all duration-500 ease-out ${
                  pwSectionOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="p-5 sm:p-6">
                    {pwMsg && <SuccessAlert>{pwMsg}</SuccessAlert>}
                    {pwErr && <ErrorAlert>{pwErr}</ErrorAlert>}
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      <Field label="رمز عبور فعلی">
                        <div className="relative">
                          <Lock className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                          <Input
                            type={showOldPw ? 'text' : 'password'}
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className={`${inputClass} pr-11 pl-11`}
                            required
                            placeholder="رمز عبور فعلی"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOldPw(!showOldPw)}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {showOldPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </Field>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="رمز عبور جدید">
                          <div className="relative">
                            <Lock className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                            <Input
                              type={showNewPw ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className={`${inputClass} pr-11 pl-11`}
                              required
                              placeholder="حداقل ۶ کاراکتر"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPw(!showNewPw)}
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                            >
                              {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </Field>
                        <Field label="تکرار رمز عبور">
                          <Input
                            type={showNewPw ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={inputClass}
                            required
                            placeholder="تکرار رمز عبور"
                          />
                        </Field>
                      </div>
                      <Button
                        type="submit"
                        disabled={pwLoading}
                        className="h-11 rounded-xl font-bold shadow-md shadow-primary/15"
                      >
                        <Lock className="ml-2 h-4 w-4" />
                        {pwLoading ? 'در حال تغییر...' : 'تغییر رمز عبور'}
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* ── Right Column ── */}
          <div className="space-y-6">
            {/* ── Verification Status ── */}
            <SectionCard delay={0.1}>
              <SectionHead
                icon={Shield}
                title="تأیید حساب"
                tone="from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:text-emerald-400"
              />
              <div className="space-y-3 p-5">
                {[
                  {
                    key: 'phone',
                    icon: Phone,
                    label: 'تلفن',
                    verified: user?.phone_verified,
                    hasValue: !!user?.phone,
                  },
                  {
                    key: 'email',
                    icon: Mail,
                    label: 'ایمیل',
                    verified: user?.email_verified,
                    hasValue: !!user?.email,
                  },
                ].map(({ key, icon: Icon, label, verified, hasValue }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-gradient-to-l from-muted/40 to-transparent p-3.5 transition-all duration-300 hover:border-border hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-border/50">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-semibold">{label}</span>
                    </div>
                    {verified ? (
                      <Badge className="gap-1 rounded-lg border-0 bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-600">
                        <CheckCircle className="h-3 w-3" />
                        تأیید شده
                      </Badge>
                    ) : hasValue ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendVerification(key)}
                        disabled={verifyLoading}
                        className="h-8 rounded-lg text-xs font-semibold"
                      >
                        تأیید
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="rounded-lg text-xs">وارد نشده</Badge>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* ── Quick Stats ── */}
            <SectionCard delay={0.14}>
              <SectionHead
                icon={Star}
                title="خلاصه حساب"
                tone="from-blue-500/15 to-cyan-500/10 text-blue-600 dark:text-blue-400"
              />
              <div className="space-y-2.5 p-5">
                {[
                  { label: 'آدرس‌ها', value: addresses.length.toLocaleString('fa-IR'), icon: MapPin },
                  { label: 'علاقه‌مندی‌ها', value: wishlist.length.toLocaleString('fa-IR'), icon: Heart },
                  { label: 'سبد خرید', value: (cart?.total_items || 0).toLocaleString('fa-IR'), icon: ShoppingCart },
                  { label: 'تکمیل پروفایل', value: `${completionPercent.toLocaleString('fa-IR')}٪`, icon: ShieldCheck, accent: true },
                ].map(({ label, value, icon: Icon, accent }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-2xl border border-border/40 bg-muted/20 px-3.5 py-3 transition-all duration-300 hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{label}</span>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${accent ? 'text-primary' : ''}`}>
                      {value}
                    </span>
                  </div>
                ))}

                <Link to="/orders" className="block pt-1">
                  <Button
                    variant="outline"
                    className="group h-11 w-full justify-between rounded-xl border-border/60 font-semibold transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      سفارش‌های من
                    </span>
                    <ChevronLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
                  </Button>
                </Link>
              </div>
            </SectionCard>

            {/* ── Logout ── */}
            <Button
              variant="outline"
              className="h-12 w-full rounded-2xl border-destructive/25 bg-destructive/[0.04] font-bold text-destructive shadow-sm transition-all duration-300 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive hover:shadow-md"
              onClick={() => setLogoutOpen(true)}
            >
              <LogOut className="ml-2 h-4 w-4" />
              خروج از حساب
            </Button>
          </div>
        </div>

        {/* ── Addresses Section ── */}
        <SectionCard className="mt-6" delay={0.16}>
          <SectionHead
            icon={MapPin}
            title={`آدرس‌های ارسال (${addresses.length.toLocaleString('fa-IR')})`}
            tone="from-rose-500/15 to-pink-500/10 text-rose-600 dark:text-rose-400"
            action={
              <Button
                size="sm"
                onClick={openAddAddress}
                className="h-9 rounded-xl font-bold shadow-md shadow-primary/15"
              >
                <Plus className="ml-1 h-4 w-4" />
                افزودن آدرس
              </Button>
            }
          />
          <div className="p-5 sm:p-6">
            {addrLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" delay={i * 0.1} />
                ))}
              </div>
            ) : addresses.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={MapPinOff}
                  badge="آدرس‌ها"
                  title="هنوز آدرسی ثبت نکرده‌اید"
                  description="یک آدرس ارسال اضافه کنید تا خرید بعدی‌تان سریع‌تر و بدون وقفه تمام شود."
                  primaryLabel="اولین آدرس را اضافه کنید"
                  primaryOnClick={openAddAddress}
                  accent="from-emerald-500/15 via-teal-500/10 to-cyan-500/10"
                  className="py-8"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {addresses.map((addr, idx) => (
                  <div
                    key={addr.id}
                    className={`group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                      addr.is_default
                        ? 'border-primary/30 bg-gradient-to-bl from-primary/[0.08] via-card to-card shadow-md shadow-primary/5'
                        : 'border-border/50 bg-card/60 hover:border-primary/20'
                    }`}
                    style={{ animationDelay: `${idx * 0.04}s` }}
                  >
                    {addr.is_default && (
                      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-violet-500" />
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <span className="truncate font-bold">{addr.full_name}</span>
                          {addr.is_default && (
                            <Badge className="rounded-md border-0 bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary hover:bg-primary/20">
                              پیش‌فرض
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground" dir="ltr">{addr.phone}</p>
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed">{addr.address_line1}</p>
                        {addr.address_line2 && (
                          <p className="truncate text-sm text-muted-foreground">{addr.address_line2}</p>
                        )}
                        <p className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {addr.city}{addr.state ? `، ${addr.state}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => openEditAddress(addr)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteAddress(addr.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Wishlist Section ── */}
        <SectionCard className="mt-6" delay={0.2}>
          <SectionHead
            icon={Heart}
            title={`محصولات مورد علاقه (${wishlist.length.toLocaleString('fa-IR')})`}
            tone="from-red-500/15 to-rose-500/10 text-red-500"
          />
          <div className="p-5 sm:p-6">
            {wishlist.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={HeartOff}
                  badge="علاقه‌مندی‌ها"
                  title="هنوز چیزی ذخیره نکرده‌اید"
                  description="با لمس قلب روی محصولات، آن‌ها را اینجا نگه دارید تا بعداً راحت انتخاب کنید."
                  primaryLabel="کشف محصولات"
                  primaryTo="/products"
                  accent="from-red-500/15 via-rose-500/10 to-pink-500/10"
                  className="py-8"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {wishlist.map((item) => (
                  <Link key={item.id} to={`/product/${item.product?.slug}`} className="group">
                    <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/50 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/[0.06]">
                      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                        <img
                          src={item.product?.primary_image || PLACEHOLDER_IMG}
                          alt={item.product?.name}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                        {item.product?.discount_percentage > 0 && (
                          <Badge className="absolute left-2.5 top-2.5 rounded-lg border-0 bg-destructive px-2 py-0.5 text-xs font-bold shadow-md">
                            −{item.product.discount_percentage}٪
                          </Badge>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleWishlist(item.product?.id);
                          }}
                          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-white dark:bg-black/60 dark:hover:bg-black/80"
                        >
                          <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                        </button>
                      </div>
                      <div className="p-3">
                        <h4 className="truncate text-sm font-bold leading-snug transition-colors group-hover:text-primary">
                          {item.product?.name}
                        </h4>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold tabular-nums">
                            {formatPrice(item.product?.price)}
                          </span>
                          {item.product?.compare_price && (
                            <span className="text-xs font-medium text-red-500/80 line-through tabular-nums">
                              {formatPrice(item.product.compare_price)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Login History Section ── */}
        <SectionCard className="mt-6" delay={0.24}>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 border-b border-border/40 bg-gradient-to-l from-muted/40 via-transparent to-transparent px-5 py-4 text-right transition-colors hover:bg-muted/20 sm:px-6"
            onClick={() => {
              const next = !loginHistoryOpen;
              setLoginHistoryOpen(next);
              if (next && loginHistory.length === 0) loadLoginHistory();
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/15 to-blue-500/10 text-cyan-600 dark:text-cyan-400">
                <History className="h-[18px] w-[18px]" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight sm:text-lg">تاریخچه ورود</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">ورودهای اخیر حساب شما</p>
              </div>
            </div>
            <ChevronLeft
              className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
                loginHistoryOpen ? 'rotate-90' : ''
              }`}
            />
          </button>

          <div
            className={`grid transition-all duration-500 ease-out ${
              loginHistoryOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="p-5 sm:p-6">
                {loginHistoryLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 rounded-2xl" delay={i * 0.08} />
                    ))}
                  </div>
                ) : loginHistory.length === 0 ? (
                  <EmptyState
                    icon={History}
                    badge="امنیت"
                    title="هنوز ورودی ثبت نشده"
                    description="پس از ورودهای بعدی، دستگاه و زمان دسترسی اینجا نمایش داده می‌شود تا حساب‌تان امن بماند."
                    accent="from-slate-500/15 via-blue-500/10 to-cyan-500/10"
                    size="compact"
                    className="py-6"
                  />
                ) : (
                  <div className="space-y-2.5">
                    {loginHistory.map((entry, idx) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/20 p-3.5 transition-all duration-300 hover:border-border hover:bg-muted/40"
                        style={{ animationDelay: `${idx * 0.03}s` }}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-border/50">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{entry.ip_address}</span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="ltr">
                            {entry.user_agent?.substring(0, 70)}{entry.user_agent?.length > 70 ? '...' : ''}
                          </p>
                        </div>
                        <div className="shrink-0 text-left">
                          <p className="text-xs font-medium text-muted-foreground">
                            {new Date(entry.login_time).toLocaleDateString('fa-IR')}
                          </p>
                          <p className="text-xs text-muted-foreground/70">
                            {new Date(entry.login_time).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ── Delete Address Dialog ── */}
      <Dialog open={deleteAddrOpen} onOpenChange={setDeleteAddrOpen}>
        <DialogContent className="overflow-hidden rounded-3xl border-border/50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              حذف آدرس
            </DialogTitle>
            <DialogDescription className="pt-1 text-sm leading-relaxed">
              آیا مطمئن هستید که می‌خواهید این آدرس را حذف کنید؟ این عمل قابل بازگشت نیست.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse gap-2 sm:flex-row">
            <Button variant="destructive" onClick={confirmDeleteAddress} className="rounded-xl font-bold">
              بله، حذف شود
            </Button>
            <Button
              variant="outline"
              onClick={() => { setDeleteAddrOpen(false); setDeleteAddrId(null); }}
              className="rounded-xl"
            >
              انصراف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Logout Dialog ── */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="overflow-hidden rounded-3xl border-border/50 sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                <LogOut className="h-5 w-5 text-destructive" />
              </div>
              خروج از حساب
            </DialogTitle>
            <DialogDescription className="pt-1 text-sm leading-relaxed">
              آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse gap-2 sm:flex-row">
            <Button variant="destructive" onClick={handleLogout} className="rounded-xl font-bold">
              بله، خارج شوم
            </Button>
            <Button variant="outline" onClick={() => setLogoutOpen(false)} className="rounded-xl">
              انصراف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Address Form Dialog ── */}
      <Dialog open={showAddrForm} onOpenChange={setShowAddrForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border-border/50 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              {editingAddr ? 'ویرایش آدرس' : 'افزودن آدرس جدید'}
            </DialogTitle>
          </DialogHeader>
          {addrErr && <ErrorAlert>{addrErr}</ErrorAlert>}
          <form onSubmit={handleAddressSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                placeholder="نام و نام خانوادگی *"
                value={addrForm.full_name}
                onChange={(e) => setAddrForm({ ...addrForm, full_name: e.target.value })}
                required
                className={inputClass}
              />
              <Input
                placeholder="شماره تماس *"
                value={addrForm.phone}
                onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
                required
                dir="ltr"
                className={inputClass}
              />
            </div>
            <Input
              placeholder="آدرس اصلی (خیابان، کوچه، پلاک) *"
              value={addrForm.address_line1}
              onChange={(e) => setAddrForm({ ...addrForm, address_line1: e.target.value })}
              required
              className={inputClass}
            />
            <Input
              placeholder="آدرس تکمیلی (واحد، طبقه)"
              value={addrForm.address_line2}
              onChange={(e) => setAddrForm({ ...addrForm, address_line2: e.target.value })}
              className={inputClass}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="شهر *"
                value={addrForm.city}
                onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                required
                className={inputClass}
              />
              <Input
                placeholder="استان"
                value={addrForm.state}
                onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
                className={inputClass}
              />
            </div>
            <Input
              placeholder="کد پستی"
              value={addrForm.postal_code}
              onChange={(e) => setAddrForm({ ...addrForm, postal_code: e.target.value })}
              dir="ltr"
              className={inputClass}
            />
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/50 bg-muted/20 px-3.5 py-3 transition-colors hover:bg-muted/40">
              <input
                type="checkbox"
                checked={addrForm.is_default}
                onChange={(e) => setAddrForm({ ...addrForm, is_default: e.target.checked })}
                className="h-4 w-4 rounded accent-primary"
              />
              <span className="text-sm font-medium">تنظیم به عنوان آدرس پیش‌فرض</span>
            </label>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="h-11 flex-1 rounded-xl font-bold shadow-md shadow-primary/15">
                {editingAddr ? 'ذخیره تغییرات' : 'افزودن آدرس'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => { setShowAddrForm(false); resetAddrForm(); }}
              >
                انصراف
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
