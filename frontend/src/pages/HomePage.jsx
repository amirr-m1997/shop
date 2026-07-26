import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { productsAPI, pagesAPI } from '../services/api';
import ProductCarousel from '../components/ProductCarousel';
import BannerSlider from '../components/BannerSlider';
import {
  ArrowLeft, Sparkles, Star, Quote, Truck, Shield, RotateCcw,
  Headphones, Send, CheckCircle, Heart, Clock, ChevronLeft,
  ShoppingBag, Zap
} from 'lucide-react';

/* ─── Icon map (DB-driven features) ─── */
const ICON_MAP = {
  Truck, Shield, RotateCcw, Headphones, Star, Quote, Send, CheckCircle, Heart, Clock,
};

const ACCENT_COLORS = {
  discount: 'destructive',
  new: 'blue-500',
  trending: 'amber-500',
  featured: 'purple-500',
  category: 'green-500',
  brand: 'primary',
  name: 'cyan-500',
};

const SECTION_LINKS = {
  discount: '/sale',
  new: '/new-arrivals',
  trending: '/trending',
  category: (val) => `/category/${val}`,
  brand: '/products',
  featured: '/products',
  name: (val) => `/products?search=${encodeURIComponent(val)}`,
};

/* ─── Ambient mesh (reusable) ─── */
const AmbientMesh = ({ variant = 'default' }) => {
  if (variant === 'dark') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-32 -right-20 h-72 w-72 rounded-full bg-primary/[0.04] blur-3xl dark:bg-primary/[0.07]" />
      <div className="absolute bottom-0 left-1/4 h-56 w-56 rounded-full bg-violet-500/[0.04] blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.28] dark:opacity-[0.1]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.035) 1px, transparent 0)',
          backgroundSize: '26px 26px',
        }}
      />
    </div>
  );
};

/* ─── Section header ─── */
const SectionHeader = ({
  eyebrow,
  title,
  subtitle,
  action,
  accent = 'bg-primary',
  light = false,
}) => (
  <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow && (
        <div className="mb-3 flex items-center gap-2.5">
          <div className={`h-7 w-1 rounded-full ${accent}`} />
          <span
            className={`text-[11px] font-bold uppercase tracking-[0.2em] ${
              light ? 'text-white/60' : 'text-muted-foreground'
            }`}
          >
            {eyebrow}
          </span>
        </div>
      )}
      <h2
        className={`text-2xl font-black tracking-tight sm:text-3xl md:text-4xl ${
          light ? 'text-white' : ''
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-2 max-w-lg text-sm leading-relaxed sm:text-base ${
            light ? 'text-white/65' : 'text-muted-foreground'
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
    {action}
  </div>
);

/* ─── Static hero fallback (when no banners) ─── */
const StaticHero = ({ settings }) => {
  const heroImage = settings.hero_image || '';
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  return (
    <section
      className="relative h-[min(92vh,780px)] min-h-[480px] overflow-hidden bg-neutral-950"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const next = {
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
        };
        mouseRef.current = next;
        setMouse(next);
      }}
    >
      {heroImage && (
        <img
          src={heroImage}
          alt=""
          className="absolute inset-0 h-full w-full scale-105 object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-l from-black/40 via-transparent to-black/50" />

      {/* Mouse-reactive orbs */}
      <div
        className="pointer-events-none absolute h-[36rem] w-[36rem] rounded-full bg-violet-500/20 blur-[100px] transition-transform duration-700"
        style={{
          top: '10%',
          right: '5%',
          transform: `translate(${(mouse.x - 0.5) * 40}px, ${(mouse.y - 0.5) * 30}px)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute h-80 w-80 rounded-full bg-blue-500/15 blur-[80px] transition-transform duration-700"
        style={{
          bottom: '15%',
          left: '10%',
          transform: `translate(${(mouse.x - 0.5) * -30}px, ${(mouse.y - 0.5) * -20}px)`,
        }}
        aria-hidden
      />

      <div className="relative z-10 flex h-full items-end pb-20 sm:items-center sm:pb-0">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl animate-fade-in-up">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              مجموعه ویژه
            </div>
            <h1 className="mb-4 text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              {settings.hero_title}
            </h1>
            {settings.hero_subtitle && (
              <p className="mb-8 max-w-lg text-base leading-relaxed text-white/80 sm:text-lg md:text-xl">
                {settings.hero_subtitle}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="group h-12 rounded-2xl bg-white px-7 text-base font-bold text-neutral-900 shadow-xl transition-all hover:-translate-y-0.5 hover:bg-white/95 sm:h-13"
              >
                <Link to="/products" className="flex items-center gap-2">
                  خرید کنید
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-2xl border-white/25 bg-white/10 px-7 text-base font-bold text-white backdrop-blur-md hover:bg-white/20 hover:text-white sm:h-13"
              >
                <Link to="/new-arrivals">جدیدترین‌ها</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-white/50 sm:flex">
        <div className="flex h-10 w-6 items-start justify-center rounded-full border border-white/25 p-1.5">
          <div className="h-2 w-1 animate-bounce rounded-full bg-white/70" />
        </div>
      </div>
    </section>
  );
};

/* ─── Features strip ─── */
const FeaturesBar = ({ features, getIcon }) => {
  if (!features.length) return null;
  return (
    <section className="relative z-30 -mt-6 sm:-mt-8">
      <div className="container mx-auto px-4">
        <div className="overflow-hidden rounded-[1.5rem] border border-border/50 bg-card/80 shadow-2xl shadow-black/[0.06] backdrop-blur-xl ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
          <div className="grid grid-cols-2 divide-x divide-y divide-border/50 md:grid-cols-4 md:divide-y-0">
            {features.map((f, i) => {
              const IconComp = getIcon(f.icon);
              return (
                <div
                  key={f.id}
                  className="group flex items-center gap-3.5 px-4 py-5 transition-colors duration-300 hover:bg-muted/40 sm:px-5 sm:py-6"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner transition-transform duration-300 group-hover:scale-105 ${f.bg_color || 'bg-primary/10'}`}
                  >
                    <IconComp className={`h-5 w-5 ${f.color || 'text-primary'}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold tracking-tight">{f.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {f.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── Category bento ─── */
const CategoriesSection = ({ categories }) => {
  if (!categories.length) return null;

  return (
    <section className="relative py-14 sm:py-20">
      <AmbientMesh />
      <div className="container relative mx-auto px-4">
        <SectionHeader
          eyebrow="کاوش"
          title="دسته‌بندی‌ها"
          subtitle="مجموعه‌های منتخب برای هر سلیقه — از کلاسیک تا مدرن"
          action={
            <Link
              to="/products"
              className="group inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground transition-colors hover:text-primary"
            >
              همه محصولات
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </Link>
          }
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-2 lg:gap-5">
          {categories.map((cat, idx) => {
            const isFeatured = idx === 0 && categories.length > 1;
            return (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className={`group relative overflow-hidden rounded-[1.5rem] ${
                  isFeatured
                    ? 'col-span-2 row-span-2 min-h-[280px] sm:min-h-[360px] lg:min-h-[480px]'
                    : 'aspect-[4/5] sm:aspect-[3/4]'
                }`}
              >
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-violet-500/20 to-muted" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent transition-opacity duration-500 group-hover:from-black/90" />
                {/* Shine */}
                <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

                <div
                  className={`absolute bottom-0 right-0 w-full ${
                    isFeatured ? 'p-6 sm:p-8' : 'p-4 sm:p-5'
                  }`}
                >
                  {isFeatured && (
                    <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                      <Zap className="h-3 w-3 text-amber-300" />
                      محبوب‌ترین
                    </span>
                  )}
                  <h3
                    className={`font-black text-white tracking-tight ${
                      isFeatured
                        ? 'text-3xl sm:text-4xl md:text-5xl'
                        : 'text-lg sm:text-xl md:text-2xl'
                    }`}
                  >
                    {cat.name}
                  </h3>
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-white/70 transition-colors group-hover:text-white sm:text-sm">
                    مشاهده محصولات
                    <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* ─── Lookbook / Trends ─── */
const TrendsSection = ({ styles }) => {
  if (!styles.length) return null;
  const items = styles.slice(0, 4);

  return (
    <section className="relative overflow-hidden bg-neutral-950 py-16 sm:py-20">
      <AmbientMesh variant="dark" />
      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        aria-hidden
      />

      <div className="container relative mx-auto px-4">
        <SectionHeader
          eyebrow="استایل"
          title={
            <span className="flex items-center gap-2.5">
              <Sparkles className="h-7 w-7 text-amber-400" />
              ترندهای روز
            </span>
          }
          subtitle="الهام از استایل‌های تازه — برای کسانی که جلوتر از زمان حرکت می‌کنند"
          light
          accent="bg-amber-400"
          action={
            <Link
              to="/lookbook"
              className="group inline-flex items-center gap-1.5 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/20"
            >
              لوک‌بوک کامل
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </Link>
          }
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {items.map((item, idx) => (
            <Link
              key={item.id}
              to={item.link || '/lookbook'}
              className="group relative overflow-hidden rounded-[1.35rem]"
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              <div className="aspect-[3/4] overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-amber-500/30 to-violet-500/20" />
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <span className="mb-1.5 block text-[10px] font-bold tracking-widest text-amber-300/90">
                  ۰{(idx + 1).toLocaleString('fa-IR')}
                </span>
                <h3 className="text-base font-black text-white sm:text-lg">{item.title}</h3>
                <p className="mt-1 flex items-center gap-1 text-xs text-white/60 transition-colors group-hover:text-white">
                  مشاهده استایل
                  <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
                </p>
              </div>
              {/* Border glow on hover */}
              <div className="pointer-events-none absolute inset-0 rounded-[1.35rem] ring-1 ring-white/10 transition-all duration-500 group-hover:ring-2 group-hover:ring-amber-400/40" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── Mid-page CTA band ─── */
const CtaBand = () => (
  <section className="relative py-6 sm:py-8">
    <div className="container mx-auto px-4">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-border/50 bg-gradient-to-l from-primary via-primary to-primary/90 px-6 py-10 text-primary-foreground shadow-2xl shadow-primary/20 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-10 h-48 w-48 rounded-full bg-white/5 blur-2xl" />

        <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] opacity-70">
              تجربه خرید لوکس
            </p>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
              آماده‌اید استایل‌تان را متحول کنید؟
            </h2>
            <p className="mt-2 max-w-md text-sm opacity-80">
              جدیدترین‌ها، تخفیف‌های ویژه و پیشنهادهای شخصی‌سازی‌شده در انتظار شماست.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-2xl bg-white px-6 font-bold text-neutral-900 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-white/95"
            >
              <Link to="/products" className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                شروع خرید
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-2xl border-white/30 bg-white/10 px-6 font-bold text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
            >
              <Link to="/sale">تخفیف‌ها</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ─── Testimonials ─── */
const TestimonialsSection = ({
  testimonials,
  currentTestimonial,
  setCurrentTestimonial,
  showTestimonialForm,
  setShowTestimonialForm,
  testimonialForm,
  setTestimonialForm,
  testimonialSubmitting,
  testimonialSubmitted,
  handleTestimonialSubmit,
}) => {
  if (!testimonials.length) return null;
  const t = testimonials[currentTestimonial];

  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <AmbientMesh />
      <div className="container relative mx-auto px-4">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5">
            <Quote className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">نظرات مشتریان</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl md:text-4xl">
            مشتریان ما چه می‌گویند؟
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            صدای واقعی خریدارانی که به کیفیت و استایل ما اعتماد کرده‌اند
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          {/* Quote card */}
          <div className="relative overflow-hidden rounded-[1.75rem] border border-border/50 bg-card/80 p-7 shadow-2xl shadow-primary/[0.05] backdrop-blur-xl sm:p-10">
            <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
            <Quote className="absolute left-6 top-6 h-12 w-12 text-primary/[0.08]" aria-hidden />

            <div className="relative">
              <div className="mb-5 flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 transition-colors ${
                      i < t.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/25'
                    }`}
                  />
                ))}
              </div>

              <p className="mb-8 min-h-[5rem] text-lg font-medium leading-relaxed tracking-tight sm:text-xl md:text-2xl">
                «{t.text}»
              </p>

              <div className="flex items-center gap-3.5">
                <div className="flex h-13 w-13 h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-lg font-black text-primary-foreground shadow-lg shadow-primary/25">
                  {t.name[0]}
                </div>
                <div>
                  <p className="font-bold tracking-tight">{t.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t.role || 'خریدار'}
                  </p>
                </div>
              </div>

              {testimonials.length > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentTestimonial(i)}
                      className={`h-2 rounded-full transition-all duration-500 ${
                        i === currentTestimonial
                          ? 'w-9 bg-primary'
                          : 'w-2 bg-muted-foreground/25 hover:bg-muted-foreground/45'
                      }`}
                      aria-label={`نظر ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit form */}
          <div className="mt-7 text-center">
            {!showTestimonialForm ? (
              <Button
                variant="outline"
                onClick={() => setShowTestimonialForm(true)}
                className="h-11 rounded-2xl border-border/60 px-6 font-bold shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
              >
                <Quote className="ml-2 h-4 w-4" />
                نظر شما چیست؟
              </Button>
            ) : (
              <div className="rounded-[1.5rem] border border-border/50 bg-card/80 p-6 text-right shadow-xl backdrop-blur-xl sm:p-7 animate-fade-in-up">
                {testimonialSubmitted ? (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                      <CheckCircle className="h-8 w-8 text-emerald-500" />
                    </div>
                    <p className="text-lg font-black">نظر شما با موفقیت ارسال شد!</p>
                    <p className="text-sm text-muted-foreground">
                      پس از تایید ادمین، نظر شما نمایش داده خواهد شد.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleTestimonialSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold">نام شما *</label>
                        <Input
                          required
                          placeholder="نام خود را وارد کنید"
                          value={testimonialForm.name}
                          onChange={(e) =>
                            setTestimonialForm((prev) => ({ ...prev, name: e.target.value }))
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold">سمت (اختیاری)</label>
                        <Input
                          placeholder="مثلاً خریدار دائمی"
                          value={testimonialForm.role}
                          onChange={(e) =>
                            setTestimonialForm((prev) => ({ ...prev, role: e.target.value }))
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold">نظر شما *</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="نظر خود را بنویسید..."
                        className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={testimonialForm.text}
                        onChange={(e) =>
                          setTestimonialForm((prev) => ({ ...prev, text: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold">امتیاز شما</label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() =>
                              setTestimonialForm((prev) => ({ ...prev, rating: star }))
                            }
                            className="p-0.5 transition-transform hover:scale-110 active:scale-95"
                            aria-label={`${star} ستاره`}
                          >
                            <Star
                              className={`h-7 w-7 ${
                                star <= testimonialForm.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-muted-foreground/30'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowTestimonialForm(false)}
                        className="rounded-xl"
                      >
                        انصراف
                      </Button>
                      <Button
                        type="submit"
                        disabled={testimonialSubmitting}
                        className="h-11 rounded-xl px-6 font-bold shadow-md shadow-primary/15"
                      >
                        <Send className="ml-2 h-4 w-4" />
                        {testimonialSubmitting ? 'در حال ارسال...' : 'ارسال نظر'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── Loading skeleton ─── */
const HomeSkeleton = () => (
  <div className="min-h-screen">
    <div className="h-[min(92vh,780px)] min-h-[480px] animate-pulse bg-muted" />
    <div className="container mx-auto -mt-6 px-4">
      <div className="h-24 animate-pulse rounded-[1.5rem] bg-muted" />
    </div>
    <div className="container mx-auto space-y-10 px-4 py-14">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-[1.5rem] bg-muted" />
        ))}
      </div>
      {[1, 2].map((i) => (
        <div key={i}>
          <div className="mb-4 h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-72 w-48 shrink-0 animate-pulse rounded-[1.35rem] bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ═══════════════════════════════════════
   Main Homepage
   ═══════════════════════════════════════ */
const HomePage = () => {
  const [sections, setSections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [styles, setStyles] = useState([]);
  const [banners, setBanners] = useState([]);
  const [settings, setSettings] = useState({});
  const [features, setFeatures] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [testimonialForm, setTestimonialForm] = useState({
    name: '',
    role: '',
    text: '',
    rating: 5,
  });
  const [testimonialSubmitting, setTestimonialSubmitting] = useState(false);
  const [testimonialSubmitted, setTestimonialSubmitted] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [
          sectionsRes,
          catsRes,
          settingsRes,
          stylesRes,
          bannersRes,
          testimonialsRes,
          featuresRes,
        ] = await Promise.all([
          productsAPI.getHomepageSections(),
          productsAPI.getCategories(),
          pagesAPI.getSettings(),
          productsAPI.getStyles(),
          productsAPI.getBanners(),
          pagesAPI.getTestimonials(),
          pagesAPI.getFeatures(),
        ]);
        setSections(sectionsRes.data);
        const allCats = catsRes.data.results || catsRes.data || [];
        setCategories(allCats.filter((c) => !c.parent));
        setSettings(settingsRes.data);
        setStyles(stylesRes.data || []);
        setBanners(bannersRes.data);
        const tData = testimonialsRes.data.results || testimonialsRes.data || [];
        setTestimonials(tData);
        setFeatures(featuresRes.data.results || featuresRes.data || []);
      } catch (error) {
        console.error('Error fetching homepage data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (testimonials.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const getViewAllLink = (section) => {
    const link = SECTION_LINKS[section.filter_type];
    if (typeof link === 'function') return link(section.filter_value);
    return link || '/products';
  };

  const handleTestimonialSubmit = async (e) => {
    e.preventDefault();
    if (!testimonialForm.name.trim() || !testimonialForm.text.trim()) return;
    setTestimonialSubmitting(true);
    try {
      await pagesAPI.submitTestimonial(testimonialForm);
      setTestimonialSubmitted(true);
      setTestimonialForm({ name: '', role: '', text: '', rating: 5 });
      setTimeout(() => {
        setTestimonialSubmitted(false);
        setShowTestimonialForm(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting testimonial:', error);
    } finally {
      setTestimonialSubmitting(false);
    }
  };

  const getIconComponent = (iconName) => ICON_MAP[iconName] || Truck;

  if (loading) return <HomeSkeleton />;

  return (
    <div className="min-h-screen">
      {/* ═══ HERO ═══ */}
      {banners.length > 0 ? (
        <BannerSlider banners={banners} />
      ) : settings.hero_title ? (
        <StaticHero settings={settings} />
      ) : null}

      {/* ═══ FEATURES (overlapping glass strip) ═══ */}
      <FeaturesBar features={features} getIcon={getIconComponent} />

      {/* ═══ CATEGORIES — bento ═══ */}
      <CategoriesSection categories={categories} />

      {/* ═══ LOOKBOOK / TRENDS — dark editorial ═══ */}
      <TrendsSection styles={styles} />

      {/* ═══ DYNAMIC PRODUCT SECTIONS ═══ */}
      <div className="relative">
        <AmbientMesh />
        {sections.map((section, idx) => (
          <div
            key={section.id}
            className={idx % 2 === 1 ? 'bg-muted/30 dark:bg-muted/10' : ''}
          >
            <ProductCarousel
              title={section.title}
              products={section.products}
              viewAllLink={getViewAllLink(section)}
              accentColor={ACCENT_COLORS[section.filter_type] || 'primary'}
            />
          </div>
        ))}
      </div>

      {/* ═══ CTA BAND ═══ */}
      <CtaBand />

      {/* ═══ TESTIMONIALS ═══ */}
      <TestimonialsSection
        testimonials={testimonials}
        currentTestimonial={currentTestimonial}
        setCurrentTestimonial={setCurrentTestimonial}
        showTestimonialForm={showTestimonialForm}
        setShowTestimonialForm={setShowTestimonialForm}
        testimonialForm={testimonialForm}
        setTestimonialForm={setTestimonialForm}
        testimonialSubmitting={testimonialSubmitting}
        testimonialSubmitted={testimonialSubmitted}
        handleTestimonialSubmit={handleTestimonialSubmit}
      />
    </div>
  );
};

export default HomePage;
