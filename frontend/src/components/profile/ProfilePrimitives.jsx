import { CheckCircle } from 'lucide-react';

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

export { AmbientBg, CompletionRing, ErrorAlert, Field, SectionCard, SectionHead, SuccessAlert };

