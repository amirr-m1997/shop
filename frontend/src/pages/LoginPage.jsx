import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/AuthLayout';
import AuthInput from '../components/AuthInput';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'خطا در ورود به سیستم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="ورود به حساب کاربری"
      subtitle="خوش آمدید! برای ادامه وارد حساب خود شوید"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <AuthInput
          label="نام کاربری"
          icon={Mail}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          placeholder="نام کاربری خود را وارد کنید"
          autoFocus
        />

        <AuthInput
          label="رمز عبور"
          icon={Lock}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="رمز عبور خود را وارد کنید"
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

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/20"
            />
            <span className="text-sm text-slate-300">مرا به خاطر بسپار</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            فراموشی رمز عبور؟
          </Link>
        </div>

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
          {loading ? 'در حال ورود...' : 'ورود'}
        </button>

        <p className="text-center text-sm text-slate-400">
          حساب کاربری ندارید؟{' '}
          <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            ثبت نام کنید
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
