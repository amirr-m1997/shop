import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Users, UserCheck,
  ClipboardList, Settings, ChevronLeft, ChevronRight, LogOut, Store,
  BarChart3, CalendarDays, Shield,
} from 'lucide-react';
import { useAdminAuth } from '../contexts/AdminAuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'داشبورد', icon: LayoutDashboard },
  { to: '/products', label: 'محصولات', icon: Package },
  { to: '/orders', label: 'سفارشات', icon: ShoppingCart },
  { to: '/customers', label: 'مشتریان', icon: UserCheck },
  { to: '/reports', label: 'گزارشات', icon: BarChart3 },
  { to: '/calendar', label: 'تقویم', icon: CalendarDays },
  { to: '/roles', label: 'نقش و دسترسی', icon: Shield },
  { to: '/todos', label: 'وظایف', icon: ClipboardList },
  { to: '/settings', label: 'تنظیمات', icon: Settings },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { logout, user } = useAdminAuth();

  return (
    <aside
      className={`fixed right-0 top-0 h-full z-30 bg-sidebar-bg text-sidebar-text transition-all duration-300 flex flex-col ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-700/50">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <Store className="h-6 w-6 text-blue-400" />
            <span className="font-bold text-white text-lg">پنل مدیریت</span>
          </Link>
        )}
        {collapsed && (
          <Link to="/" className="mx-auto">
            <Store className="h-6 w-6 text-blue-400" />
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-sidebar-active text-white shadow-lg shadow-blue-500/20'
                  : 'hover:bg-sidebar-hover text-sidebar-text hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info + collapse toggle */}
      <div className="border-t border-slate-700/50 p-3 space-y-2">
        {!collapsed && user && (
          <Link to="/settings" className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-sidebar-hover text-xs text-slate-400 hover:text-white truncate">
            <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-blue-400">
                {(user.first_name || user.username)?.[0]}
              </span>
            </div>
            <span className="truncate">{user.first_name || user.username}</span>
          </Link>
        )}
        <div className="flex gap-1">
          <button
            onClick={onToggle}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-sidebar-hover text-sidebar-text hover:text-white transition-colors"
            title={collapsed ? 'باز کردن' : 'جمع کردن'}
          >
            {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {!collapsed && <span>جمع کردن</span>}
          </button>
          <button
            onClick={logout}
            className="flex items-center justify-center px-3 py-2 rounded-lg text-sm hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
            title="خروج"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
