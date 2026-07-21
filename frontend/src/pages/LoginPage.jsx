import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">ورود به حساب کاربری</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            خوش آمدید! برای ادامه خرید وارد شوید
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">نام کاربری</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="نام کاربری خود را وارد کنید"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">رمز عبور</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="رمز عبور خود را وارد کنید"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="text-muted-foreground">مرا به خاطر بسپار</span>
              </label>
              <Link to="/forgot-password" className="text-primary hover:underline">
                فراموشی رمز عبور؟
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'در حال ورود...' : 'ورود'}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              حساب کاربری ندارید؟{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                ثبت نام کنید
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
