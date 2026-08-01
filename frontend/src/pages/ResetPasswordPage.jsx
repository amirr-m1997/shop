import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import AuthInput from '../components/AuthInput';
import { authAPI } from '../services/api';
import { SEO } from '../lib/seo';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const token = searchParams.get('token') || location.state?.token || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/forgot-password');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('رمز عبور و تکرار آن مطابقت ندارند');
      return;
    }

    if (newPassword.length < 6) {
      setError('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.passwordResetConfirm({
        token,
        new_password: newPassword,
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'خطا در بازیابی رمز عبور');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout>
        <SEO title="بازنشانی رمز" noIndex />
        <div className="text-center py-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-foreground">رمز عبور با موفقیت تغییر کرد</h2>
          <p className="mt-2 text-sm text-muted-foreground">در حال انتقال به صفحه اصلی...</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="بازیابی رمز عبور"
      subtitle="رمز عبور جدید خود را وارد کنید"
      showBack
    >
      <SEO title="بازنشانی رمز" noIndex />
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive backdrop-blur-sm">
            {error}
          </div>
        )}

        <AuthInput
          label="رمز عبور جدید"
          icon={Lock}
          type={showPassword ? 'text' : 'password'}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          placeholder="رمز عبور جدید (حداقل ۶ کاراکتر)"
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground/50 hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <AuthInput
          label="تکرار رمز عبور"
          icon={Lock}
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="رمز عبور را دوباره وارد کنید"
        />

        <button
          type="submit"
          disabled={loading}
          className="relative w-full rounded-2xl bg-neutral-900 py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-neutral-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-neutral-900/20 hover:bg-neutral-800 disabled:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-white dark:text-neutral-900 dark:shadow-white/10 dark:hover:bg-white/95 dark:hover:shadow-white/20"
        >
          {loading && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-neutral-900/30 dark:border-t-neutral-900" />
            </div>
          )}
          {loading ? 'در حال بازیابی...' : 'بازیابی رمز عبور'}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary/80 hover:text-primary font-medium transition-colors">
            بازگشت به صفحه ورود
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
