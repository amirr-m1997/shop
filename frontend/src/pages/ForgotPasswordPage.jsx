import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import AuthInput from '../components/AuthInput';
import { authAPI } from '../services/api';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setResetToken('');
    setLoading(true);

    try {
      const response = await authAPI.passwordReset({ email });
      setMessage(response.data.message);
      if (response.data.reset_token) {
        setResetToken(response.data.reset_token);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'خطا در ارسال درخواست');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="بازیابی رمز عبور"
      subtitle="ایمیل خود را وارد کنید تا لینک بازیابی برایتان ارسال شود"
      showBack
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive backdrop-blur-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-3 backdrop-blur-sm">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              {message}
            </div>

            {resetToken && (
              <div className="rounded-2xl border border-border/60 bg-background/60 p-5 backdrop-blur-sm dark:border-white/[0.08]">
                <p className="text-sm font-bold text-foreground mb-2">توکن بازیابی (برای تست):</p>
                <code className="text-xs break-all block p-3 rounded-xl bg-muted/60 border border-border/40 text-primary font-mono" dir="ltr">
                  {resetToken}
                </code>
                <button
                  onClick={() => navigate('/reset-password', { state: { token: resetToken } })}
                  className="mt-4 w-full rounded-2xl bg-neutral-900 py-3 px-4 text-sm font-bold text-white shadow-lg shadow-neutral-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:shadow-white/10 dark:hover:bg-white/95"
                >
                  بازیابی رمز عبور
                  <ArrowRight className="h-4 w-4 mr-1 inline-block" />
                </button>
              </div>
            )}

            <Link to="/login">
              <button className="w-full rounded-2xl border border-border/60 bg-background/60 py-3 px-4 text-sm font-medium text-foreground transition-all duration-300 hover:bg-muted/40 backdrop-blur-sm dark:border-white/[0.08]">
                بازگشت به صفحه ورود
              </button>
            </Link>
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <AuthInput
              label="ایمیل"
              icon={Mail}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ایمیل خود را وارد کنید"
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
              {loading ? 'در حال ارسال...' : 'ارسال لینک بازیابی'}
            </button>

            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="text-primary/80 hover:text-primary font-medium transition-colors">
                بازگشت به صفحه ورود
              </Link>
            </p>
          </form>
        )}
      </div>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
