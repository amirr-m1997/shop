import React, { useState } from 'react';
import { User, Lock, Save } from 'lucide-react';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user } = useAdminAuth();
  const [passwords, setPasswords] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(false);

  const roleLabel = {
    super_admin: 'مدیر اصلی',
    admin: 'مدیر',
    moderator: 'ناظر',
    user: 'کاربر عادی',
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      toast.error('رمز عبور جدید و تکرار آن مطابقت ندارند');
      return;
    }
    if (passwords.new_password.length < 6) {
      toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }
    setLoading(true);
    try {
      await authAPI.changePassword({
        old_password: passwords.old_password,
        new_password: passwords.new_password,
      });
      toast.success('رمز عبور با موفقیت تغییر کرد');
      setPasswords({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'خطا در تغییر رمز عبور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
        پروفایل من
      </h1>

      {/* User Info */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <User className="h-8 w-8 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {user?.first_name || user?.username}
            </h2>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">نام کاربری:</span>
            <span className="mr-2 text-slate-800 dark:text-slate-100 font-medium">{user?.username}</span>
          </div>
          <div>
            <span className="text-slate-500">نقش:</span>
            <span className="mr-2 text-slate-800 dark:text-slate-100 font-medium">
              {roleLabel[user?.role] || user?.role}
            </span>
          </div>
          <div>
            <span className="text-slate-500">ایمیل:</span>
            <span className="mr-2 text-slate-800 dark:text-slate-100">{user?.email || '—'}</span>
          </div>
          <div>
            <span className="text-slate-500">تاریخ عضویت:</span>
            <span className="mr-2 text-slate-800 dark:text-slate-100">
              {user?.date_joined ? new Date(user.date_joined).toLocaleDateString('fa-IR') : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5" />
          تغییر رمز عبور
        </h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              رمز عبور فعلی
            </label>
            <input
              type="password"
              value={passwords.old_password}
              onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              رمز عبور جدید
            </label>
            <input
              type="password"
              value={passwords.new_password}
              onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              تکرار رمز عبور جدید
            </label>
            <input
              type="password"
              value={passwords.confirm_password}
              onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-colors disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {loading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </form>
      </div>
    </div>
  );
}
