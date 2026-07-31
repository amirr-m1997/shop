import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, ShoppingCart, Users, DollarSign,
  TrendingUp, AlertTriangle, ArrowUpLeft, ArrowDownLeft, Download,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { dashboardAPI, lowStockAPI, activityAPI, exportAPI } from '../services/api';
import { formatPrice, formatDate } from '../lib/utils';

const STATUS_LABELS = {
  pending: { label: 'در انتظار', class: 'badge-warning' },
  processing: { label: 'پردازش', class: 'badge-info' },
  shipped: { label: 'ارسال شده', class: 'badge-info' },
  delivered: { label: 'تحویل شده', class: 'badge-success' },
  cancelled: { label: 'لغو شده', class: 'badge-danger' },
  returned: { label: 'مرجوع شده', class: 'badge-danger' },
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, chartRes, ordersRes, lowStockRes, activityRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getSalesChart(),
        dashboardAPI.getRecentOrders(),
        lowStockAPI.list(5),
        activityAPI.list(),
      ]);
      setStats(statsRes.data);
      setChartData(chartRes.data);
      setRecentOrders(ordersRes.data);
      setLowStock(lowStockRes.data);
      setActivities(activityRes.data.slice(0, 8));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'کل محصولات',
      value: stats?.total_products || 0,
      icon: Package,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'کل سفارشات',
      value: stats?.total_orders || 0,
      icon: ShoppingCart,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      title: 'کل کاربران',
      value: stats?.total_users || 0,
      icon: Users,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      title: 'درآمد کل',
      value: formatPrice(stats?.total_revenue || 0) + ' تومان',
      icon: DollarSign,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      title: 'سفارشات این ماه',
      value: stats?.orders_this_month || 0,
      icon: TrendingUp,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
    },
    {
      title: 'درآمد این ماه',
      value: formatPrice(stats?.revenue_this_month || 0) + ' تومان',
      icon: DollarSign,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      title: 'سفارشات در انتظار',
      value: stats?.pending_orders || 0,
      icon: AlertTriangle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      title: 'موجودی کم',
      value: stats?.low_stock_products || 0,
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
  ];

  const chartMonths = chartData.map((d) => ({
    ...d,
    monthLabel: d.month,
  }));

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.title}</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                    {card.value}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
            نمودار فروش
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartMonths}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                  }}
                  formatter={(value) => [formatPrice(value) + ' تومان', 'فروش']}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
            نمودار سفارشات
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartMonths}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                  }}
                />
                <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            آخرین سفارشات
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                try {
                  const res = await exportAPI.orders();
                  const url = window.URL.createObjectURL(new Blob([res.data]));
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'orders.csv';
                  a.click();
                } catch {}
              }}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-500 transition-colors"
            >
              <Download className="h-4 w-4" />
              خروجی CSV
            </button>
            <Link
              to="/orders"
              className="text-sm text-blue-500 hover:text-blue-600 transition-colors"
            >
              مشاهده همه
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>شماره سفارش</th>
                <th>مشتری</th>
                <th>مبلغ</th>
                <th>وضعیت</th>
                <th>تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => {
                const st = STATUS_LABELS[order.status] || { label: order.status, class: 'badge-secondary' };
                return (
                  <tr key={order.id}>
                    <td className="font-mono text-xs">{order.order_number}</td>
                    <td>{order.user_username}</td>
                    <td>{formatPrice(order.total)} تومان</td>
                    <td>
                      <span className={`badge ${st.class}`}>{st.label}</span>
                    </td>
                    <td className="text-xs">{formatDate(order.created_at)}</td>
                  </tr>
                );
              })}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-slate-400">
                    سفارشی وجود ندارد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low Stock + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              موجودی کم
            </h3>
            <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
              {lowStock.length} مورد
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-64 overflow-y-auto">
            {lowStock.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                همه محصولات موجودی کافی دارند
              </div>
            ) : (
              lowStock.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  {p.primary_image ? (
                    <img src={p.primary_image} alt="" className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                      <Package className="h-4 w-4 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{p.name}</div>
                    <div className="text-xs text-slate-400">{p.category_name}</div>
                  </div>
                  <span className={`text-sm font-bold ${p.stock === 0 ? 'text-red-500' : 'text-amber-500'}`}>
                    {p.stock}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              آخرین فعالیت‌ها
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-64 overflow-y-auto">
            {activities.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                فعالیتی ثبت نشده
              </div>
            ) : (
              activities.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-6 py-3">
                  <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                    a.action === 'create' ? 'bg-emerald-500' :
                    a.action === 'update' ? 'bg-blue-500' :
                    a.action === 'delete' ? 'bg-red-500' :
                    a.action === 'status_change' ? 'bg-amber-500' :
                    a.action === 'export' ? 'bg-purple-500' :
                    'bg-slate-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{a.description}</p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {a.user_username} · {formatDate(a.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
