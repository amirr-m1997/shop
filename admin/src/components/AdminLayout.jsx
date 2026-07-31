import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAdminAuth } from '../contexts/AdminAuthContext';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, loading, isAdmin } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            دسترسی غیرمجاز
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            شما اجازه دسترسی به پنل مدیریت را ندارید.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Header sidebarCollapsed={collapsed} />
      <main
        className="p-6 transition-all duration-300"
        style={{ marginRight: collapsed ? '72px' : '256px' }}
      >
        <Outlet />
      </main>
    </div>
  );
}
