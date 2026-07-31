import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { Sun, Moon, User } from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function Header({ sidebarCollapsed }) {
  const { dark, toggle } = useTheme();
  const { user } = useAdminAuth();

  const roleLabel = {
    super_admin: 'مدیر اصلی',
    admin: 'مدیر',
    moderator: 'ناظر',
    user: 'کاربر',
  };

  return (
    <header
      className={`sticky top-0 z-20 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 transition-all duration-300`}
      style={{ marginRight: sidebarCollapsed ? '72px' : '256px' }}
    >
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          پنل مدیریت فروشگاه
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          title={dark ? 'حالت روشن' : 'حالت تاریک'}
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* User */}
        {user && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-sm">
              <div className="font-medium text-slate-800 dark:text-slate-100">
                {user.first_name || user.username}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {roleLabel[user.role] || user.role}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
