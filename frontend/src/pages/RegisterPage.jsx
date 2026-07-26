import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/AuthLayout';
import AuthInput from '../components/AuthInput';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('رمز عبور و تکرار آن مطابقت ندارند');
      return;
    }

    setLoading(true);

    try {
      await register(username, email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'خطا در ثبت نام');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="ثبت نام حساب کاربری"
      subtitle="همین حالا ثبت نام کنید و از امکانات کامل استفاده کنید"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <AuthInput
          label="نام کاربری"
          icon={User}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          placeholder="نام کاربری خود را وارد کنید"
        />

        <AuthInput
          label="ایمیل"
          icon={Mail}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="ایمیل خود را وارد کنید"
        />

        <AuthInput
          label="رمز عبور"
          icon={Lock}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="رمز عبور خود را وارد کنید (حداقل ۶ کاراکتر)"
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
          {loading ? 'در حال ثبت نام...' : 'ثبت نام'}
        </button>

        <p className="text-center text-sm text-slate-400">
          قبلاً ثبت نام کرده‌اید؟{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            وارد شوید
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
