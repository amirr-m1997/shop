import React, { useState, useEffect } from 'react';
import { Search, Eye, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { customersAPI } from '../services/api';
import { formatPrice, formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, [page]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      const res = await customersAPI.list(params);
      setCustomers(res.data.results || []);
      setTotalPages(Math.ceil((res.data.count || 0) / 20));
    } catch {
      toast.error('خطا در بارگذاری مشتریان');
    } finally {
      setLoading(false);
    }
  };

  const viewHistory = async (customer) => {
    setSelectedCustomer(customer);
    setHistoryLoading(true);
    try {
      const res = await customersAPI.getOrderHistory(customer.id);
      setOrderHistory(res.data.orders);
    } catch {
      toast.error('خطا در بارگذاری تاریخچه');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadCustomers();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">مشتریان</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">لیست مشتریان و تاریخچه خرید</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customers Table */}
        <div className={`${selectedCustomer ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden`}>
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>مشتری</th>
                    <th>ایمیل</th>
                    <th>تعداد سفارش</th>
                    <th>مجموع خرید</th>
                    <th>تاریخ عضویت</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className={selectedCustomer?.id === c.id ? 'bg-blue-50 dark:bg-blue-900/10' : ''}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                            <User className="h-4 w-4 text-slate-400" />
                          </div>
                          <div>
                            <div className="font-medium">{c.first_name || c.username}</div>
                            <div className="text-xs text-slate-400">@{c.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm">{c.email || '—'}</td>
                      <td>{c.order_count}</td>
                      <td className="font-medium">{formatPrice(c.total_spent)} تومان</td>
                      <td className="text-xs">{formatDate(c.date_joined)}</td>
                      <td>
                        <button
                          onClick={() => viewHistory(c)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-500 transition-colors"
                          title="تاریخچه خرید"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-slate-400">
                        مشتری یافت نشد
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

        {/* Order History Sidebar */}
        {selectedCustomer && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                تاریخچه خرید
              </h3>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                بستن
              </button>
            </div>
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="font-medium text-slate-800 dark:text-slate-100">
                  {selectedCustomer.first_name || selectedCustomer.username}
                </div>
                <div className="text-xs text-slate-400">{selectedCustomer.email}</div>
              </div>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              </div>
            ) : orderHistory.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">
                سفارشی ثبت نشده
              </div>
            ) : (
              <div className="space-y-3">
                {orderHistory.map((o) => (
                  <div key={o.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs">{o.order_number}</span>
                      <span className={`badge ${
                        o.status === 'delivered' ? 'badge-success' :
                        o.status === 'cancelled' ? 'badge-danger' :
                        o.status === 'pending' ? 'badge-warning' :
                        'badge-info'
                      }`}>
                        {o.status_display}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className="text-slate-500">{o.items_count} آیتم</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {formatPrice(o.total)} تومان
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">{formatDate(o.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
