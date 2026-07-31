import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Lock } from 'lucide-react';
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
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive backdrop-blur-sm">
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
              className="text-muted-foreground/50 hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border/60 bg-background/60 text-primary focus:ring-primary/20"
            />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              مرا به خاطر بسپار
            </span>
          </label>
          <Link
            to="/forgot-password"
            className="text-sm text-primary/80 hover:text-primary font-medium transition-colors"
          >
            فراموشی رمز عبور؟
          </Link>
        </div>

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
          {loading ? 'در حال ورود...' : 'ورود'}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          حساب کاربری ندارید؟{' '}
          <Link to="/register" className="text-primary/80 hover:text-primary font-semibold transition-colors">
            ثبت نام کنید
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
