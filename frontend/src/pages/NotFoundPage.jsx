import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* ── Background decorative elements ────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-blue-500/5 blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 w-[480px] h-[480px] rounded-full bg-purple-500/5 blur-[100px]" />
      </div>

      {/* ── Grid pattern overlay ──────────────────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #1e293b 1px, transparent 1px),
            linear-gradient(to bottom, #1e293b 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center">
        {/* ── 404 Number ──────────────────────────────────────────────── */}
        <div className="relative mb-8">
          <h1 className="text-[80px] sm:text-[100px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 leading-none">
            ۴۰۴
          </h1>
          <div className="absolute inset-0 flex items-center justify-center text-[100px] sm:text-[120px] font-black text-slate-950/20 select-none">
            ۴۰۴
          </div>
        </div>

        {/* ── Message ─────────────────────────────────────────────────── */}
        <h2 className="text-2xl font-bold text-slate-100 mb-3">صفحه مورد نظر یافت نشد</h2>
        <p className="text-slate-400 mb-8 max-w-md text-sm">
          صفحه‌ای که به دنبال آن هستید وجود ندارد یا حذف شده است.
          شاید آدرس را اشتباه وارد کرده باشید.
        </p>

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:from-blue-600 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-500/30"
          >
            <Home className="h-4 w-4" />
            بازگشت به صفحه اصلی
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-6 py-3 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-slate-800/50"
          >
            <Search className="h-4 w-4" />
            مرور محصولات
          </Link>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <p className="mt-12 text-xs text-slate-500">
          © {new Date().getFullYear()} فروشگاه مد. تمامی حقوق محفوظ است.
        </p>
      </div>
    </div>
  );
};

export default NotFoundPage;
