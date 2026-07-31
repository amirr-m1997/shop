import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const AuthLayout = ({ children, title, subtitle, showBack = false, backHref = '/login' }) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* ── Ambient background blobs ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-primary/5 blur-[120px] dark:bg-primary/10" />
        <div className="absolute -bottom-40 -left-40 h-[480px] w-[480px] rounded-full bg-primary/3 blur-[100px] dark:bg-primary/8" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-primary/2 blur-[80px] dark:bg-primary/5" />
      </div>

      {/* ── Subtle grid pattern ── */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* ── Content ── */}
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* Back link */}
          {showBack && (
            <Link
              to={backHref}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
              بازگشت
            </Link>
          )}

          {/* Logo / Brand */}
          <div className="flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-xl shadow-neutral-900/20 dark:bg-white dark:text-neutral-900 dark:shadow-white/10">
              <span className="text-2xl font-black">◈</span>
            </div>
            <h1 className="mt-4 text-xl font-black tracking-tight text-foreground">
              فروشگاه مد
            </h1>
          </div>

          {/* ── Glassmorphism card ── */}
          <div className="rounded-[1.75rem] border border-border/40 bg-card/70 shadow-2xl shadow-black/[0.06] backdrop-blur-xl dark:border-white/[0.08] dark:bg-card/50 dark:shadow-black/30">
            <div className="p-6 sm:p-8">
              {title && (
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-black tracking-tight text-foreground">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {subtitle}
                    </p>
                  )}
                </div>
              )}
              {children}
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} فروشگاه مد. تمامی حقوق محفوظ است.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
