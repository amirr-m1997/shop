import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import AuthInput from '../components/AuthInput';
import { authAPI } from '../services/api';

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
        <div className="text-center py-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-100">رمز عبور با موفقیت تغییر کرد</h2>
          <p className="mt-2 text-sm text-slate-400">در حال انتقال به صفحه اصلی...</p>
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
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
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
              className="text-slate-500 hover:text-slate-300 transition-colors"
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
          className="relative w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:from-blue-600 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          )}
          {loading ? 'در حال بازیابی...' : 'بازیابی رمز عبور'}
        </button>

        <p className="text-center text-sm text-slate-400">
          <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
            بازگشت به صفحه ورود
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
