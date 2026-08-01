import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart, Target, Users, Leaf, ArrowLeft, Sparkles,
  ShoppingBag, Star, Shield, Truck, Package,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { pagesAPI } from '../services/api';
import Skeleton from '../components/ui/Skeleton';
import { SEO } from '../lib/seo';

/* ── Animated counter hook ───────────────────────────── */
function useCountUp(end, duration = 2000, enabled = false) {
  const [count, setCount] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!enabled || end <= 0) return;
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [end, duration, enabled]);

  return count;
}

/* ── Intersection observer hook ──────────────────────── */
function useInView(threshold = 0.3) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ── Stat card ───────────────────────────────────────── */
function StatCard({ icon: Icon, value, label, suffix = '', color }) {
  const [ref, visible] = useInView(0.4);
  const animated = useCountUp(value, 2200, visible);

  return (
    <div ref={ref} className="group relative flex flex-col items-center gap-3 p-6 sm:p-8">
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${color} transition-transform duration-300 group-hover:scale-110`}>
        <Icon className="h-7 w-7" />
      </div>
      <div className="text-center">
        <p className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight">
          {animated.toLocaleString('fa-IR')}{suffix}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/* ── Value card ──────────────────────────────────────── */
function ValueCard({ icon: Icon, title, desc, delay }) {
  return (
    <div
      className="group relative rounded-3xl border border-border/50 bg-card p-6 sm:p-8 text-center transition-all duration-500 hover:shadow-lg hover:border-primary/20 hover:-translate-y-1"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

/* ── Floating decoration ─────────────────────────────── */
function FloatingShape({ className, delay = 0 }) {
  return (
    <div
      className={`absolute rounded-full opacity-20 blur-3xl pointer-events-none animate-float-soft ${className}`}
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

/* ═══════════════════════════════════════════════════════ */
const VALUES = [
  { icon: Heart, title: 'عشق به مد', desc: 'با عشق و دقت، بهترین مدل‌ها را برای شما انتخاب می‌کنیم. هر محصول با وسواس فراوان گلچین شده است.' },
  { icon: Target, title: 'کیفیت بی‌نظیر', desc: 'فقط محصولات با کیفیت و از برندهای معتبر جهانی. کیفیتی که لمس می‌کنید.' },
  { icon: Users, title: 'اولویت مشتری', desc: 'رضایت شما سنگ بنای ماست. پشتیبانی ۲۴ ساعته و خدمات پس از فروش بی‌نقص.' },
  { icon: Leaf, title: 'مسئولیت اجتماعی', desc: 'تعهد به تولید پایدار و مسئولانه. مراقبت از محیط زیست وظیفه ماست.' },
];

export default function AboutPage() {
  const [settings, setSettings] = useState({});
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    pagesAPI.getSettings().then(r => setSettings(r.data)).catch(() => {});
    pagesAPI.getAboutStats()
      .then(r => setStats(r.data))
      .catch(() => setStats({ products_count: 0, users_count: 0, brands_count: 0, customer_satisfaction: 0 }))
      .finally(() => setStatsLoading(false));
  }, []);

  const satisfaction = stats?.customer_satisfaction ?? 0;

  return (
    <div className="min-h-screen overflow-hidden">
      <SEO
        title="درباره ما"
        description="درباره فروشگاه مد | داستان ما، ارزش‌ها و تعهد ما به کیفیت و رضایت مشتریان"
        url="https://fashionshop.ir/about"
      >
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'فروشگاه مد',
            url: 'https://fashionshop.ir',
            logo: 'https://fashionshop.ir/logo.png',
            description: 'فروشگاه آنلاین پوشاک مردانه و زنانه',
            sameAs: [],
          })}
        </script>
      </SEO>

      {/* ── Hero Section ─────────────────────────────────── */}
      <section className="relative flex items-center justify-center overflow-hidden min-h-[460px] sm:min-h-[560px]">
        {/* Animated gradient background */}
        <div className="absolute inset-0 animate-gradient-x" style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 25%, #f97316 50%, #6366f1 75%, #ec4899 100%)',
          backgroundSize: '400% 400%',
        }} />

        {/* Mesh blobs */}
        <div className="absolute top-[-10%] right-[-5%] h-[500px] w-[500px] rounded-full bg-yellow-400/30 mix-blend-overlay blur-3xl animate-blob" />
        <div className="absolute bottom-[-15%] left-[-10%] h-[600px] w-[600px] rounded-full bg-cyan-400/25 mix-blend-overlay blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-[20%] left-[30%] h-[300px] w-[300px] rounded-full bg-fuchsia-400/20 mix-blend-overlay blur-3xl animate-blob animation-delay-4000" />

        {/* Floating rings */}
        <div className="absolute top-[15%] right-[10%] h-24 w-24 rounded-full border-2 border-white/20 animate-spin-slow" />
        <div className="absolute bottom-[20%] left-[8%] h-16 w-16 rounded-full border-2 border-white/15 animate-spin-slow-reverse" />
        <div className="absolute top-[40%] right-[25%] h-8 w-8 rounded-full bg-white/20 animate-bounce-slow" />
        <div className="absolute bottom-[35%] left-[20%] h-6 w-6 rounded-full bg-yellow-300/30 animate-bounce-slow animation-delay-1000" />
        <div className="absolute top-[60%] right-[35%] h-4 w-4 rounded-full bg-white/25 animate-pulse" />
        <div className="absolute top-[25%] left-[15%] h-3 w-3 rounded-full bg-pink-300/40 animate-pulse animation-delay-700" />

        {/* Grid dots */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
        }} />

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-20 sm:py-28 text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2 text-sm font-bold text-white backdrop-blur-md shadow-lg shadow-black/10 animate-fade-in-down">
            <Sparkles className="h-4 w-4 text-yellow-300" />
            <span>از سال ۱۳۹۸ تا امروز</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight tracking-tight mb-6 animate-fade-in-up drop-shadow-lg">
            {settings.about_title || 'داستان ما'}
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-white/90 leading-relaxed animate-fade-in-up animation-delay-200">
            ما باور داریم مد حق همه است. با کیفیت بی‌نظیر، قیمت منصفانه و تجربه‌ای متفاوت،
            اینجاییم تا استایل رویاهایتان را بسازیم.
          </p>

          {/* Animated stat badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-fade-in-up animation-delay-400">
            {[
              { icon: ShoppingBag, text: `${(stats?.products_count ?? 0).toLocaleString('fa-IR')}+ محصول`, bg: 'bg-white/20 hover:bg-white/30' },
              { icon: Users, text: `${(stats?.users_count ?? 0).toLocaleString('fa-IR')}+ مشتری`, bg: 'bg-white/20 hover:bg-white/30' },
              { icon: Star, text: `${satisfaction}% رضایت`, bg: 'bg-yellow-400/30 hover:bg-yellow-400/40 border border-yellow-300/30' },
            ].map(({ icon: Ic, text, bg }) => (
              <span key={text} className={`inline-flex items-center gap-2 rounded-full ${bg} px-5 py-2.5 text-sm font-bold text-white backdrop-blur-md transition-all duration-300 hover:scale-105 shadow-lg shadow-black/10`}>
                <Ic className="h-4 w-4" />
                {text}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 inset-x-0">
          <svg viewBox="0 0 1440 120" fill="none" className="w-full">
            <path d="M0 120V60C180 100 360 20 540 60C720 100 900 20 1080 60C1260 100 1380 40 1440 60V120H0Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </section>

      {/* ── Story Section ────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="animate-fade-in-up">
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">داستان ما</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">
              از یک ایده ساده تا
              <span className="text-primary"> مقصد شما برای مد</span>
            </h2>
            <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
              {settings.about_content ? (
                settings.about_content.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)
              ) : (
                <>
                  <p>
                    فروشگاه مد با یک هدف ساده متولد شد: ارائه بهترین محصولات مد و فشن
                    به مشتریانی که کیفیت و استایل را می‌فهمند.
                  </p>
                  <p>
                    ما باور داریم که هر کسی حق دارد با کیفیت‌ترین و شیک‌ترین لباس‌ها را
                    با قیمت مناسب در اختیار داشته باشد. تیم ما شامل کارشناسان مد و فشن
                    است که هر محصول را با وسواس انتخاب می‌کنند.
                  </p>
                  <p>
                    امروز با بیش از هزاران مشتری راضی، به یکی از محبوب‌ترین فروشگاه‌های
                    آنلاین مد تبدیل شده‌ایم.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Visual element */}
          <div className="relative">
            {settings.about_image ? (
              <div className="relative overflow-hidden rounded-3xl shadow-2xl">
                <img src={settings.about_image} alt="تیم ما" className="w-full object-cover aspect-[4/3]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            ) : (
              <div className="relative rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 sm:p-12 border border-border/50">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Package, label: 'ارسال سریع', desc: 'تحویل در کوتاه‌ترین زمان' },
                    { icon: Shield, label: 'ضمانت اصالت', desc: '۱۰۰٪ اصل و معتبر' },
                    { icon: Truck, label: 'ارسال رایگان', desc: 'برای سفارش‌های بالای ۵۰۰ هزار تومان' },
                    { icon: Heart, label: 'پشتیبانی', desc: 'همراه شما در هر قدم' },
                  ].map(({ icon: Ic, label, desc }) => (
                    <div key={label} className="flex flex-col items-center gap-2 rounded-2xl bg-background/80 p-5 text-center shadow-sm border border-border/30">
                      <Ic className="h-6 w-6 text-primary" />
                      <span className="text-sm font-bold">{label}</span>
                      <span className="text-xs text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Dynamic Statistics ───────────────────────────── */}
      <section className="relative overflow-hidden border-y border-border/50 bg-muted/30">
        {/* Decorative bg */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        <div className="relative container mx-auto px-4 py-16 sm:py-20">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">افتخارات ما</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black">اعداد و ارقام</h2>
          </div>

          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex flex-col items-center gap-3 p-6">
                  <Skeleton className="h-14 w-14 rounded-2xl" delay={i * 0.08} />
                  <Skeleton className="h-8 w-20 rounded" delay={i * 0.12} />
                  <Skeleton className="h-4 w-16 rounded" delay={i * 0.16} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              <StatCard icon={ShoppingBag} value={stats?.products_count ?? 0} suffix="+" label="محصول متنوع" color="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
              <StatCard icon={Users} value={stats?.users_count ?? 0} suffix="+" label="مشتری راضی" color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
              <StatCard icon={Star} value={stats?.brands_count ?? 0} suffix="+" label="برند معتبر" color="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
              <StatCard icon={Target} value={satisfaction} suffix="٪" label={stats?.satisfaction_title || 'رضایت مشتریان'} color="bg-rose-500/10 text-rose-600 dark:text-rose-400" />
            </div>
          )}
        </div>
      </section>

      {/* ── Values Section ───────────────────────────────── */}
      <section className="container mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">چرا ما؟</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black">ارزش‌های ما</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            چهار ستونی که فروشگاه ما بر پایه آن‌ها بنا شده
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {VALUES.map((v, i) => (
            <ValueCard key={i} icon={v.icon} title={v.title} desc={v.desc} delay={i * 80} />
          ))}
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────────── */}
      <section className="container mx-auto px-4 pb-16 sm:pb-24">
        <div className="relative overflow-hidden rounded-3xl p-10 sm:p-16 text-center text-white" style={{
          background: 'linear-gradient(135deg, #6366f1, #ec4899, #f97316)',
        }}>
          {/* Decorations */}
          <div className="absolute top-[-10%] right-[-5%] h-40 w-40 rounded-full bg-white/15 blur-2xl animate-blob" />
          <div className="absolute bottom-[-15%] left-[-8%] h-52 w-52 rounded-full bg-white/10 blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute inset-0 opacity-[0.06]" style={{
            backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
          }} />

          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 drop-shadow-sm">
              آماده‌اید استایل خود را پیدا کنید؟
            </h2>
            <p className="text-white/85 mb-8 max-w-lg mx-auto">
              هزاران محصول منتظر شماست. همین حالا شروع به کاوش کنید.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/products">
                <Button size="lg" className="bg-white text-gray-900 hover:bg-white/90 w-full sm:w-auto font-bold shadow-lg">
                  مشاهده محصولات
                  <ArrowLeft className="h-4 w-4 mr-1" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" className="bg-white/15 text-white border border-white/30 hover:bg-white/25 backdrop-blur-sm w-full sm:w-auto font-bold shadow-lg">
                  تماس با ما
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
