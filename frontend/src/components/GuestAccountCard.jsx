import React, { useState } from 'react';
import { UserPlus, Loader2, ShieldCheck, X, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/Button';
import { useAuth } from '../contexts/AuthContext';

const GuestAccountCard = ({ orderNumber }) => {
  const { guestRegister } = useAuth();
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [created, setCreated] = useState(false);

  if (!orderNumber) return null;

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setCreateError('رمز عبور باید حداقل ۶ کاراکتر باشد.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await guestRegister(password, orderNumber);
      setCreated(true);
    } catch (err) {
      setCreateError(err.message || 'خطا در ایجاد حساب');
    } finally {
      setCreating(false);
    }
  };

  if (created) {
    return (
      <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          حساب شما ساخته شد و سفارش به آن متصل شد.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-right">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h2 className="font-bold text-sm">حساب بسازید تا سفارش را پیگیری کنید</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        با ایمیل خود یک حساب بسازید تا سفارش و فاکتورهایتان همیشه در دسترس باشد. رمز عبور را انتخاب کنید؛ ایمیل شما همان است که هنگام ثبت سفارش وارد کردید.
      </p>
      <form onSubmit={handleCreateAccount} className="space-y-3">
        <input
          type="password"
          dir="ltr"
          placeholder="رمز عبور (حداقل ۶ کاراکتر)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-left text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        {createError && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-red-500">
            <X className="h-3.5 w-3.5" />
            {createError}
          </p>
        )}
        <Button type="submit" disabled={creating} className="w-full rounded-xl">
          {creating ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              در حال ساخت حساب...
            </>
          ) : (
            <>
              <UserPlus className="ml-2 h-4 w-4" />
              ساخت حساب و ورود
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default GuestAccountCard;
