import { Link } from 'react-router-dom';
import { ShoppingBag, Plus, Sparkles, ShoppingCart, Truck, ShieldCheck, Gift } from 'lucide-react';
import { Button } from '../ui/Button';
import AmbientBg from './AmbientBg';

const EmptyCart = () => (
  <div className="relative min-h-[70vh]">
    <AmbientBg />
    <div className="container relative mx-auto max-w-lg px-4 py-20 text-center animate-fade-in-up">
      <div className="relative mx-auto mb-10 h-44 w-44">
        <div className="absolute inset-0 animate-[pulse_3s_ease-in-out_infinite] rounded-full bg-gradient-to-br from-primary/15 via-violet-500/10 to-blue-500/10 blur-2xl" />
        <div className="absolute inset-4 rounded-full border border-dashed border-border/80 opacity-60" />
        <div className="absolute inset-8 rounded-full border border-border/40" />
        <div className="relative flex h-full w-full items-center justify-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-border/50 bg-gradient-to-br from-card via-card to-muted/40 shadow-xl shadow-primary/5 ring-1 ring-white/20 dark:ring-white/5">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/60" strokeWidth={1.15} />
          </div>
        </div>
        <div className="absolute -bottom-1 -left-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background">
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div className="absolute -right-2 top-6 flex h-8 w-8 items-center justify-center rounded-xl bg-card shadow-md ring-1 ring-border/60">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        </div>
      </div>

      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
        سبد خرید
      </p>
      <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
        هنوز چیزی اینجا نیست
      </h2>
      <p className="mx-auto mb-10 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
        مجموعه‌های منتخب و محصولات خاص منتظر شما هستند. اولین انتخاب‌تان را اضافه کنید.
      </p>

      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button
          asChild
          size="lg"
          className="h-12 rounded-2xl px-8 text-base font-bold shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
        >
          <Link to="/products" className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            کشف محصولات
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="h-12 rounded-2xl border-border/70 bg-card/50 px-8 backdrop-blur-sm transition-all hover:bg-card"
        >
          <Link to="/">بازگشت به خانه</Link>
        </Button>
      </div>

      <div className="mt-14 grid grid-cols-3 gap-3">
        {[
          { icon: Truck, label: 'ارسال سریع', tone: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' },
          { icon: ShieldCheck, label: 'خرید امن', tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
          { icon: Gift, label: 'بسته‌بندی لوکس', tone: 'text-violet-600 dark:text-violet-400 bg-violet-500/10' },
        ].map(({ icon: Icon, label, tone }) => (
          <div
            key={label}
            className="rounded-2xl border border-border/50 bg-card/60 p-4 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          >
            <div className={`mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground sm:text-xs">{label}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default EmptyCart;
