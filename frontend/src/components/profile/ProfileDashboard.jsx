import { Link } from 'react-router-dom';
import {
  User, Mail, Lock, Save, MapPin, Phone,
  Package, LogOut, Calendar, Eye, EyeOff,
  CheckCircle, Shield, Cake, ShoppingCart, Heart,
  ChevronLeft, X, BadgeCheck, AlertCircle, Sparkles,
  ShieldCheck, Star, MessageCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { SEO } from '../../lib/seo';
import { formatDate } from '../../lib/formatDate';
import { JalaliDatePicker, toJalaliString } from '../ui/JalaliDatePicker';
import ProfileDialogs from './ProfileDialogs';
import ProfileCollections from './ProfileCollections';
import CustomerClubSection from './CustomerClubSection';

import {
  AmbientBg, CompletionRing, ErrorAlert, Field, SectionCard, SectionHead, SuccessAlert,
} from './ProfilePrimitives';



const STYLE_PREFERENCE_OPTIONS = ['مینیمال', 'لوکس', 'مونوکروم', 'استریت', 'کلاسیک', 'مدرن', 'اسپرت', 'رمانتیک'];


const ProfileDashboard = ({ model }) => {
  const {
    user, cart, wishlist, toggleWishlist, completionPercent, initials, displayName, greeting,
    profileForm, setProfileForm, profileMsg, profileErr, profileLoading, avatarUploading,
    fileInputRef, handleProfileSubmit, handleAvatarChange, handleRemoveAvatar,
    oldPassword, setOldPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword,
    showOldPw, setShowOldPw, showNewPw, setShowNewPw, pwMsg, pwErr, pwLoading,
    verifyType, setVerifyType, verifyCode, setVerifyCode, verifyMsg, verifyErr, verifyLoading,
    verifyCodeDev, setVerifyCodeDev, handlePasswordSubmit, handleSendVerification, handleVerifyCode,
    addresses, addrLoading, showAddrForm, setShowAddrForm, editingAddr, addrForm, setAddrForm,
    addrErr, deleteAddrOpen, setDeleteAddrOpen, setDeleteAddrId, resetAddrForm, openAddAddress,
    openEditAddress, handleAddressSubmit, handleDeleteAddress, confirmDeleteAddress,
    loginHistory, loginHistoryLoading, loginHistoryOpen, setLoginHistoryOpen, loadLoginHistory,
    logoutOpen, setLogoutOpen, pwSectionOpen, setPwSectionOpen, handleLogout, inputClass,
  } = model;

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
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/85 text-3xl font-black text-primary-foreground shadow-2xl shadow-primary/30 ring-4 ring-background transition-transform duration-500 hover:scale-[1.02] focus:outline-none focus:ring-offset-2 sm:h-28 sm:w-28 sm:text-4xl"
                title="تغییر تصویر پروفایل"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
                {avatarUploading && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold text-white">
                    در حال بارگذاری…
                  </span>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              {(user?.phone_verified || user?.email_verified) && (
                <div className="absolute -bottom-1 -left-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-background">
                  <BadgeCheck className="h-4 w-4" />
                </div>
              )}
              <div className="pointer-events-none absolute -bottom-2 left-1/2 flex -translate-x-1/2 gap-1 rounded-full border border-border/60 bg-background/95 px-2 py-1 text-[10px] font-bold opacity-0 shadow-md backdrop-blur transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="hover:text-primary"
                >
                  تغییر
                </button>
                {user?.avatar && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveAvatar(); }}
                      className="hover:text-destructive"
                    >
                      حذف
                    </button>
                  </>
                )}
              </div>
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

        {/* ── Mobile Quick Actions (orders + logout at top) ── */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:hidden">
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-xl border-border/60 bg-background/80 font-bold shadow-sm backdrop-blur-sm"
          >
            <Link to="/orders" className="flex items-center justify-center gap-2">
              <Package className="h-4 w-4" />
              سفارش‌های من
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-xl border-destructive/25 bg-destructive/[0.04] font-bold text-destructive shadow-sm hover:bg-destructive/10"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="h-4 w-4" />
            خروج از حساب
          </Button>
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
            <CustomerClubSection />

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

                  <Field label="سبک‌های پوشش مورد علاقه" hint="چند مورد را انتخاب کنید؛ در گفتگو به دیگران نمایش داده می‌شود">
                    <div className="flex flex-wrap gap-2 pt-1">
                      {STYLE_PREFERENCE_OPTIONS.map((tag) => {
                        const active = profileForm.style_preferences.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setProfileForm({
                                ...profileForm,
                                style_preferences: active
                                  ? profileForm.style_preferences.filter((t) => t !== tag)
                                  : [...profileForm.style_preferences, tag],
                              })
                            }
                            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                              active
                                ? 'border-amber-500/50 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'border-border/60 bg-muted/40 text-muted-foreground hover:border-amber-500/30 hover:text-foreground'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

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

        <ProfileCollections
          addresses={addresses}
          addrLoading={addrLoading}
          openAddAddress={openAddAddress}
          openEditAddress={openEditAddress}
          handleDeleteAddress={handleDeleteAddress}
          wishlist={wishlist}
          toggleWishlist={toggleWishlist}
          loginHistoryOpen={loginHistoryOpen}
          setLoginHistoryOpen={setLoginHistoryOpen}
          loadLoginHistory={loadLoginHistory}
          loginHistoryLoading={loginHistoryLoading}
          loginHistory={loginHistory}
        />      </div>

      <ProfileDialogs
        deleteAddrOpen={deleteAddrOpen}
        setDeleteAddrOpen={setDeleteAddrOpen}
        setDeleteAddrId={setDeleteAddrId}
        confirmDeleteAddress={confirmDeleteAddress}
        logoutOpen={logoutOpen}
        setLogoutOpen={setLogoutOpen}
        handleLogout={handleLogout}
        showAddrForm={showAddrForm}
        setShowAddrForm={setShowAddrForm}
        editingAddr={editingAddr}
        addrErr={addrErr}
        handleAddressSubmit={handleAddressSubmit}
        addrForm={addrForm}
        setAddrForm={setAddrForm}
        inputClass={inputClass}
        resetAddrForm={resetAddrForm}
      />
    </div>
  );;
};

export default ProfileDashboard;
