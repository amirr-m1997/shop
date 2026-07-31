import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { ordersAPI } from '../services/api';
import { formatPrice, formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

const STATUS_CHOICES = [
  { value: 'pending', label: 'در انتظار بررسی', class: 'badge-warning' },
  { value: 'processing', label: 'در حال پردازش', class: 'badge-info' },
  { value: 'shipped', label: 'ارسال شده', class: 'badge-info' },
  { value: 'delivered', label: 'تحویل داده شده', class: 'badge-success' },
  { value: 'cancelled', label: 'لغو شده', class: 'badge-danger' },
  { value: 'returned', label: 'مرجوع شده', class: 'badge-danger' },
];

const PAYMENT_STATUS_CHOICES = [
  { value: 'unpaid', label: 'پرداخت نشده', class: 'badge-warning' },
  { value: 'paid', label: 'پرداخت شده', class: 'badge-success' },
  { value: 'refunded', label: 'بازپرداخت شده', class: 'badge-danger' },
];

const PAYMENT_METHOD_LABELS = {
  online: 'پرداخت آنلاین',
  cash_on_delivery: 'پرداخت در محل',
  card: 'کارت به کارت',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter, paymentStatus]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (paymentStatus) params.payment_status = paymentStatus;
      const res = await ordersAPI.list(params);
      setOrders(res.data.results || []);
      setTotalPages(Math.ceil((res.data.count || 0) / 20));
    } catch {
      toast.error('خطا در بارگذاری سفارشات');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await ordersAPI.update(orderId, { status: newStatus });
      toast.success('وضعیت سفارش بروزرسانی شد');
      loadOrders();
    } catch {
      toast.error('خطا در بروزرسانی وضعیت');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadOrders();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          مدیریت سفارشات
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          مشاهده و مدیریت سفارشات مشتریان
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو در شماره سفارش یا نام کاربر..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 pr-10 pl-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </form>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="">همه وضعیت‌ها</option>
            {STATUS_CHOICES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={paymentStatus}
            onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="">وضعیت پرداخت</option>
            {PAYMENT_STATUS_CHOICES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
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
                  <th>شماره سفارش</th>
                  <th>مشتری</th>
                  <th>مبلغ کل</th>
                  <th>روش پرداخت</th>
                  <th>وضعیت پرداخت</th>
                  <th>وضعیت سفارش</th>
                  <th>تاریخ</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const st = STATUS_CHOICES.find((s) => s.value === order.status) || { label: order.status, class: 'badge-secondary' };
                  const ps = PAYMENT_STATUS_CHOICES.find((s) => s.value === order.payment_status) || { label: order.payment_status, class: 'badge-secondary' };
                  return (
                    <tr key={order.id}>
                      <td className="font-mono text-xs">{order.order_number}</td>
                      <td>{order.user_username}</td>
                      <td className="font-medium">{formatPrice(order.total)} تومان</td>
                      <td className="text-xs">{PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method}</td>
                      <td><span className={`badge ${ps.class}`}>{ps.label}</span></td>
                      <td>
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className="rounded-lg border border-slate-200 dark:border-slate-600 bg-transparent px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                        >
                          {STATUS_CHOICES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="text-xs">{formatDate(order.created_at)}</td>
                      <td>
                        <Link
                          to={`/orders/${order.id}`}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-500 transition-colors inline-flex"
                          title="جزئیات"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-slate-400">
                      سفارشی یافت نشد
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
              <ChevronRight className="h-4 w-4" />
              قبلی
            </button>
            <span className="text-sm text-slate-500">
              صفحه {page} از {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              بعدی
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
