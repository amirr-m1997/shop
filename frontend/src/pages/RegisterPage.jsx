import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, Mail, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/AuthLayout';
import AuthInput from '../components/AuthInput';
import { SEO } from '../lib/seo';

const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{2,29}$/;
const USERNAME_ERROR = 'نام کاربری فقط میتواند شامل حروف انگلیسی، اعداد و خط زیر (_) باشد و با یک حرف انگلیسی شروع شود.';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUsernameError('');

    if (!USERNAME_REGEX.test(username.trim())) {
      setUsernameError(USERNAME_ERROR);
      return;
    }

    if (password !== confirmPassword) {
      setError('رمز عبور و تکرار آن مطابقت ندارند');
      return;
    }

    setLoading(true);

    try {
      await register(username.trim(), email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'ثبت‌نام ناموفق بود. دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="ساخت حساب"
      subtitle="حساب بسازید؛ خرید را شروع کنید"
    >
      <SEO title="ثبت نام" noIndex />
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
          onChange={(e) => {
            setUsername(e.target.value);
            setUsernameError('');
          }}
          required
          placeholder="نام کاربری شما"
          error={usernameError}
          helperText="نام کاربری بعد از ثبت قابل تغییر نیست"
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
          placeholder="رمز عبور (حداقل ۶ کاراکتر)"
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
          {loading ? 'در حال ثبت نام...' : 'ثبت نام'}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          قبلاً ثبت نام کرده‌اید؟{' '}
          <Link to="/login" className="text-primary/80 hover:text-primary font-semibold transition-colors">
            وارد شوید
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
