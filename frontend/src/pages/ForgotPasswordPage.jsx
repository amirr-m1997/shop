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
      <div className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {message && (
          <div className="space-y-4">
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              {message}
            </div>

            {resetToken && (
              <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-4">
                <p className="text-sm font-medium text-slate-300 mb-2">توکن بازیابی (برای تست):</p>
                <code className="text-xs break-all block p-2 bg-slate-900 rounded-lg border border-slate-700 text-blue-300" dir="ltr">
                  {resetToken}
                </code>
                <button
                  onClick={() => navigate('/reset-password', { state: { token: resetToken } })}
                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-2.5 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:from-blue-600 hover:to-indigo-700"
                >
                  بازیابی رمز عبور
                  <ArrowRight className="h-4 w-4 mr-1 inline-block" />
                </button>
              </div>
            )}

            <Link to="/login">
              <button className="w-full rounded-xl border border-slate-700 py-2.5 px-4 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-slate-800/50">
                بازگشت به صفحه ورود
              </button>
            </Link>
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit} className="space-y-6">
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
              className="relative w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:from-blue-600 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </div>
              )}
              {loading ? 'در حال ارسال...' : 'ارسال لینک بازیابی'}
            </button>

            <p className="text-center text-sm text-slate-400">
              <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
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
