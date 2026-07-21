import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Mail, Lock, Save, Plus, Trash2, MapPin, Phone,
  Package, LogOut, Calendar, Eye, EyeOff, AlertTriangle,
  CheckCircle, Pencil, Shield, Cake, ShoppingCart, Heart,
  ChevronLeft, X, BadgeCheck, AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/Dialog';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { authAPI, productsAPI } from '../services/api';
import { formatPrice } from '../lib/formatPrice';
import { formatDate } from '../lib/formatDate';
import { JalaliDatePicker, toJalaliString } from '../components/ui/JalaliDatePicker';

/* ─── Stat Card ─── */
const STAT_COLORS = {
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-500' },
};

const StatCard = ({ icon: Icon, label, value, color = 'primary' }) => {
  const colors = STAT_COLORS[color] || STAT_COLORS.primary;
  return (
    <div className="flex items-center gap-3 p-4 bg-background border rounded-xl">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colors.bg}`}>
        <Icon className={`h-5 w-5 ${colors.text}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
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
      // Refresh user data
      const res = await authAPI.getUser();
      // Update auth context if possible
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
    if (!window.confirm('آیا از حذف این آدرس مطمئن هستید؟')) return;
    try { await authAPI.deleteAddress(id); loadAddresses(); } catch {}
  };

  const handleLogout = async () => { await logout(); setLogoutOpen(false); navigate('/'); };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20">
      <div className="container mx-auto px-4 py-6 sm:py-10 max-w-5xl">

        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary/20 via-primary/5 to-transparent border border-primary/10 mb-8">
          <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-3xl sm:text-4xl font-black shadow-lg shadow-primary/25 rotate-3 group-hover:rotate-0 transition-transform">
                {initials}
              </div>
              {(user?.phone_verified || user?.email_verified) && (
                <div className="absolute -bottom-1 -left-1 h-7 w-7 bg-green-500 rounded-full flex items-center justify-center border-2 border-background">
                  <BadgeCheck className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-right">
              <h1 className="text-2xl sm:text-3xl font-black">
                {user?.first_name && user?.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user?.username}
              </h1>
              <p className="text-muted-foreground mt-1" dir="ltr">{user?.email}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                {user?.phone && (
                  <Badge variant="secondary" className="gap-1">
                    <Phone className="h-3 w-3" />
                    <span dir="ltr">{user.phone}</span>
                  </Badge>
                )}
                {user?.date_of_birth && (
                  <Badge variant="secondary" className="gap-1">
                    <Cake className="h-3 w-3" />
                    {toJalaliString(user.date_of_birth)}
                  </Badge>
                )}
                {user?.date_joined && (
                  <Badge variant="secondary" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    عضو: {formatDate(user.date_joined)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex sm:flex-col gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/orders">
                  <Package className="ml-1 h-4 w-4" />
                  سفارش‌ها
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/cart">
                  <ShoppingCart className="ml-1 h-4 w-4" />
                  سبد خرید ({cart?.total_items || 0})
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Profile Completion Bar ── */}
        <Card className="mb-6 border-primary/20">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">تکمیل پروفایل</span>
              <span className="text-sm font-bold text-primary">{completionPercent}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            {completionPercent < 100 && (
              <p className="text-xs text-muted-foreground mt-2">
                {completionPercent < 40
                  ? 'پروفایل خود را تکمیل کنید تا تجربه بهتری داشته باشید'
                  : 'تقریباً تمام شد! فقط کمی دیگر'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Verification Banner ── */}
        {(!user?.phone_verified && !user?.email_verified) && (
          <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">حساب خود را تأیید کنید</p>
                <p className="text-xs text-muted-foreground">برای خرید، لطفاً شماره تلفن یا ایمیل خود را تأیید کنید</p>
              </div>
              <div className="flex gap-2">
                {user?.phone && !user?.phone_verified && (
                  <Button size="sm" variant="outline" onClick={() => handleSendVerification('phone')} disabled={verifyLoading}>
                    <Phone className="ml-1 h-3 w-3" />
                    تأیید تلفن
                  </Button>
                )}
                {user?.email && !user?.email_verified && (
                  <Button size="sm" variant="outline" onClick={() => handleSendVerification('email')} disabled={verifyLoading}>
                    <Mail className="ml-1 h-3 w-3" />
                    تأیید ایمیل
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Verification Code Input ── */}
        {verifyType && (
          <Card className="mb-6 border-primary/20">
            <CardContent className="p-4">
              {verifyMsg && (
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-3 rounded-lg mb-3 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  {verifyMsg}
                </div>
              )}
              {verifyErr && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-3 text-sm">{verifyErr}</div>
              )}
              {verifyCodeDev && (
                <div className="bg-muted p-3 rounded-lg mb-3 text-sm">
                  <span className="font-medium">کد تأیید (برای تست): </span>
                  <code className="font-bold" dir="ltr">{verifyCodeDev}</code>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="کد ۶ رقمی را وارد کنید"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  maxLength={6}
                  className="flex-1"
                  dir="ltr"
                />
                <Button onClick={handleVerifyCode} disabled={verifyLoading || verifyCode.length !== 6}>
                  تأیید
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { setVerifyType(''); setVerifyCode(''); setVerifyCodeDev(''); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left Column ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* ── Personal Info ── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  اطلاعات شخصی
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profileMsg && (
                  <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-3 rounded-lg mb-4 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    {profileMsg}
                  </div>
                )}
                {profileErr && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-4 text-sm">{profileErr}</div>
                )}

                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">نام</label>
                      <Input value={profileForm.first_name} onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })} placeholder="نام" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">نام خانوادگی</label>
                      <Input value={profileForm.last_name} onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })} placeholder="نام خانوادگی" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">نام کاربری</label>
                    <Input value={user?.username || ''} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground mt-1">نام کاربری قابل تغییر نیست</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">ایمیل</label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} className="pr-10" placeholder="ایمیل" dir="ltr" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">شماره تلفن</label>
                      <div className="relative">
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="pr-10" placeholder="09121234567" dir="ltr" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">تاریخ تولد</label>
                      <JalaliDatePicker
                        value={profileForm.date_of_birth}
                        onChange={(gDate) => setProfileForm({ ...profileForm, date_of_birth: gDate })}
                        placeholder="تاریخ تولد"
                      />
                      {profileForm.date_of_birth && (
                        <p className="text-xs text-muted-foreground mt-1">{toJalaliString(profileForm.date_of_birth)}</p>
                      )}
                    </div>
                  </div>

                  <Button type="submit" disabled={profileLoading} className="w-full sm:w-auto">
                    <Save className="ml-2 h-4 w-4" />
                    {profileLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* ── Password ── */}
            <Card>
              <CardHeader className="cursor-pointer" onClick={() => setPwSectionOpen(!pwSectionOpen)}>
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    تغییر رمز عبور
                  </div>
                  <ChevronLeft className={`h-5 w-5 transition-transform ${pwSectionOpen ? 'rotate-90' : ''}`} />
                </CardTitle>
              </CardHeader>
              {pwSectionOpen && (
                <CardContent className="pt-0">
                  {pwMsg && (
                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-3 rounded-lg mb-4 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      {pwMsg}
                    </div>
                  )}
                  {pwErr && (
                    <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-4 text-sm">{pwErr}</div>
                  )}
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">رمز عبور فعلی</label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type={showOldPw ? 'text' : 'password'} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="pr-10 pl-10" required placeholder="رمز عبور فعلی" />
                        <button type="button" onClick={() => setShowOldPw(!showOldPw)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showOldPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5">رمز عبور جدید</label>
                        <div className="relative">
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pr-10 pl-10" required placeholder="حداقل ۶ کاراکتر" />
                          <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">تکرار رمز عبور</label>
                        <Input type={showNewPw ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="تکرار رمز عبور" />
                      </div>
                    </div>
                    <Button type="submit" disabled={pwLoading}>
                      <Lock className="ml-2 h-4 w-4" />
                      {pwLoading ? 'در حال تغییر...' : 'تغییر رمز عبور'}
                    </Button>
                  </form>
                </CardContent>
              )}
            </Card>
          </div>

          {/* ── Right Column ── */}
          <div className="space-y-6">
            {/* ── Verification Status ── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5" />
                  تأیید حساب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span className="text-sm">تلفن</span>
                  </div>
                  {user?.phone_verified ? (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600 gap-1">
                      <CheckCircle className="h-3 w-3" />
                      تأیید شده
                    </Badge>
                  ) : user?.phone ? (
                    <Button size="sm" variant="outline" onClick={() => handleSendVerification('phone')} disabled={verifyLoading}>
                      تأیید
                    </Button>
                  ) : (
                    <Badge variant="secondary">وارد نشده</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">ایمیل</span>
                  </div>
                  {user?.email_verified ? (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600 gap-1">
                      <CheckCircle className="h-3 w-3" />
                      تأیید شده
                    </Badge>
                  ) : user?.email ? (
                    <Button size="sm" variant="outline" onClick={() => handleSendVerification('email')} disabled={verifyLoading}>
                      تأیید
                    </Button>
                  ) : (
                    <Badge variant="secondary">وارد نشده</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── Quick Stats ── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5" />
                  خلاصه حساب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">آدرس‌ها</span>
                  <span className="font-bold">{addresses.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">تکمیل پروفایل</span>
                  <span className="font-bold text-primary">{completionPercent}%</span>
                </div>
                <Link to="/orders">
                  <Button variant="outline" className="w-full justify-between">
                    <span>سفارش‌های من</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* ── Logout ── */}
            <Button variant="destructive" className="w-full" onClick={() => setLogoutOpen(true)}>
              <LogOut className="ml-2 h-4 w-4" />
              خروج از حساب
            </Button>
          </div>
        </div>

        {/* ── Addresses Section ── */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5" />
                آدرس‌های ارسال ({addresses.length})
              </CardTitle>
              <Button size="sm" onClick={openAddAddress}>
                <Plus className="ml-1 h-4 w-4" />
                افزودن آدرس
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {addrLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">در حال بارگذاری...</p>
            ) : addresses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">هنوز آدرسی ثبت نکرده‌اید</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr) => (
                  <div key={addr.id} className={`relative p-4 border rounded-xl transition-all hover:shadow-md ${addr.is_default ? 'border-primary bg-primary/5' : 'hover:border-primary/30'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold truncate">{addr.full_name}</span>
                          {addr.is_default && <Badge variant="secondary" className="text-xs">پیش‌فرض</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground" dir="ltr">{addr.phone}</p>
                        <p className="text-sm mt-1 truncate">{addr.address_line1}</p>
                        {addr.address_line2 && <p className="text-sm text-muted-foreground truncate">{addr.address_line2}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{addr.city}، {addr.state}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditAddress(addr)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteAddress(addr.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Wishlist Section ── */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Heart className="h-5 w-5 text-red-500" />
              محصولات مورد علاقه ({wishlist.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wishlist.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">هنوز محصولی را به علاقه‌مندی‌ها اضافه نکرده‌اید</p>
                <Link to="/products">
                  <Button variant="outline" className="mt-4">
                    مشاهده محصولات
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {wishlist.map((item) => (
                  <Link key={item.id} to={`/product/${item.product?.id}`}>
                    <div className="group cursor-pointer">
                      <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden mb-2">
                        <img
                          src={item.product?.primary_image || 'https://via.placeholder.com/400x500?text=No+Image'}
                          alt={item.product?.name}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/400x500?text=No+Image'; }}
                        />
                        {item.product?.discount_percentage > 0 && (
                          <Badge className="absolute left-2 top-2 bg-destructive text-xs">
                            -{item.product.discount_percentage}%
                          </Badge>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleWishlist(item.product?.id);
                          }}
                          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/80 flex items-center justify-center hover:scale-110 transition-all"
                        >
                          <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                        </button>
                      </div>
                      <h4 className="font-semibold text-sm truncate">{item.product?.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold text-sm">{formatPrice(item.product?.price)}</span>
                        {item.product?.compare_price && (
                          <span className="text-xs text-red-500 line-through font-medium">
                            {formatPrice(item.product.compare_price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Logout Dialog ── */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              خروج از حساب
            </DialogTitle>
            <DialogDescription>آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse gap-2 sm:flex-row">
            <Button variant="destructive" onClick={handleLogout}>بله، خارج شوم</Button>
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>انصراف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Address Form Dialog ── */}
      <Dialog open={showAddrForm} onOpenChange={setShowAddrForm}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAddr ? 'ویرایش آدرس' : 'افزودن آدرس جدید'}</DialogTitle>
          </DialogHeader>
          {addrErr && <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{addrErr}</div>}
          <form onSubmit={handleAddressSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="نام و نام خانوادگی *" value={addrForm.full_name} onChange={(e) => setAddrForm({ ...addrForm, full_name: e.target.value })} required />
              <Input placeholder="شماره تماس *" value={addrForm.phone} onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })} required dir="ltr" />
            </div>
            <Input placeholder="آدرس اصلی (خیابان، کوچه، پلاک) *" value={addrForm.address_line1} onChange={(e) => setAddrForm({ ...addrForm, address_line1: e.target.value })} required />
            <Input placeholder="آدرس تکمیلی (واحد، طبقه)" value={addrForm.address_line2} onChange={(e) => setAddrForm({ ...addrForm, address_line2: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="شهر *" value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} required />
              <Input placeholder="استان" value={addrForm.state} onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })} />
            </div>
            <Input placeholder="کد پستی" value={addrForm.postal_code} onChange={(e) => setAddrForm({ ...addrForm, postal_code: e.target.value })} dir="ltr" />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={addrForm.is_default} onChange={(e) => setAddrForm({ ...addrForm, is_default: e.target.checked })} className="rounded accent-primary" />
              <span className="text-sm">تنظیم به عنوان آدرس پیش‌فرض</span>
            </label>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">{editingAddr ? 'ذخیره تغییرات' : 'افزودن آدرس'}</Button>
              <Button type="button" variant="outline" onClick={() => { setShowAddrForm(false); resetAddrForm(); }}>انصراف</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
