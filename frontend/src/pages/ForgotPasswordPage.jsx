import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { authAPI } from '../services/api';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setResetToken('');
    setLoading(true);

    try {
      const response = await authAPI.passwordReset({ email });
      setMessage(response.data.message);
      // In dev mode, show the token (in production this would be emailed)
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
    <div className="container mx-auto px-4 py-16 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">بازیابی رمز عبور</CardTitle>
          <CardDescription>
            ایمیل خود را وارد کنید تا لینک بازیابی رمز عبور برایتان ارسال شود
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {message && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-3 rounded-lg text-sm">
                {message}
              </div>

              {resetToken && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">توکن بازیابی (برای تست):</p>
                  <code className="text-xs break-all block p-2 bg-background rounded border" dir="ltr">
                    {resetToken}
                  </code>
                  <Link
                    to={`/reset-password?token=${resetToken}`}
                    className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    بازیابی رمز عبور
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}

              <Link to="/login">
                <Button variant="outline" className="w-full">
                  بازگشت به صفحه ورود
                </Button>
              </Link>
            </div>
          )}

          {!message && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">ایمیل</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-10"
                    required
                    placeholder="ایمیل خود را وارد کنید"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'در حال ارسال...' : 'ارسال لینک بازیابی'}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="text-primary hover:underline">
                  بازگشت به صفحه ورود
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
