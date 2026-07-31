import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { usersAPI } from '../services/api';
import { formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

const ROLE_CHOICES = [
  { value: 'user', label: 'کاربر عادی', class: 'badge-secondary' },
  { value: 'moderator', label: 'ناظر', class: 'badge-info' },
  { value: 'admin', label: 'مدیر', class: 'badge-warning' },
  { value: 'super_admin', label: 'مدیر اصلی', class: 'badge-success' },
];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadUsers();
  }, [page]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      const res = await usersAPI.list(params);
      setUsers(res.data.results || []);
      setTotalPages(Math.ceil((res.data.count || 0) / 20));
    } catch {
      toast.error('خطا در بارگذاری کاربران');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await usersAPI.update(userId, { profile: { role: newRole } });
      toast.success('نقش کاربر بروزرسانی شد');
      loadUsers();
    } catch {
      toast.error('خطا در بروزرسانی نقش');
    }
  };

  const handleToggleActive = async (userId) => {
    try {
      await usersAPI.update(userId, { is_active: false });
      toast.success('کاربر غیرفعال شد');
      loadUsers();
    } catch {
      toast.error('خطا در غیرفعال کردن کاربر');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          مدیریت کاربران
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          مشاهده و مدیریت نقش کاربران
        </p>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در نام کاربری یا ایمیل..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 pr-10 pl-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>نام کاربری</th>
                  <th>ایمیل</th>
                  <th>تاریخ عضویت</th>
                  <th>تعداد سفارشات</th>
                  <th>نقش</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const role = ROLE_CHOICES.find((r) => r.value === u.role) || { label: u.role, class: 'badge-secondary' };
                  return (
                    <tr key={u.id}>
                      <td className="font-medium">{u.username}</td>
                      <td className="text-sm">{u.email || '—'}</td>
                      <td className="text-xs">{formatDate(u.date_joined)}</td>
                      <td>{u.order_count}</td>
                      <td>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="rounded-lg border border-slate-200 dark:border-slate-600 bg-transparent px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                        >
                          {ROLE_CHOICES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {u.is_active ? 'فعال' : 'غیرفعال'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-400">
                      کاربری یافت نشد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" /> قبلی
            </button>
            <span className="text-sm text-slate-500">صفحه {page} از {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              بعدی <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
