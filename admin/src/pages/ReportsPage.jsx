import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Download, ArrowUpLeft, ArrowDownLeft } from 'lucide-react';
import { reportsAPI } from '../services/api';
import { formatPrice } from '../lib/utils';
import toast from 'react-hot-toast';

const GROUP_OPTIONS = [
  { value: 'day', label: 'روزانه' },
  { value: 'week', label: 'هفتگی' },
  { value: 'month', label: 'ماهانه' },
];

export default function ReportsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState('day');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [comparison, setComparison] = useState(null);
  const [compPeriod, setCompPeriod] = useState('monthly');
  const [compLoading, setCompLoading] = useState(false);

  useEffect(() => {
    const now = new Date();
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    setStartDate(monthAgo.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    loadComparison();
  }, [compPeriod]);

  const loadReport = async () => {
    if (!startDate || !endDate) {
      toast.error('تاریخ شروع و پایان را انتخاب کنید');
      return;
    }
    setLoading(true);
    try {
      const res = await reportsAPI.custom({ start_date: startDate, end_date: endDate, group_by: groupBy });
      setReportData(res.data);
    } catch {
      toast.error('خطا در بارگذاری گزارش');
    } finally {
      setLoading(false);
    }
  };

  const loadComparison = async () => {
    setCompLoading(true);
    try {
      const res = await reportsAPI.comparison({ period: compPeriod });
      setComparison(res.data);
    } catch {
      toast.error('خطا در بارگذاری مقایسه');
    } finally {
      setCompLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await reportsAPI.customExport({ start_date: startDate, end_date: endDate, group_by: groupBy });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${startDate}-to-${endDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('گزارش دانلود شد');
    } catch {
      toast.error('خطا در دانلود');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">گزارشات</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">گزارش سفارشی و مقایسه دوره‌ها</p>
      </div>

      {/* Comparison Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">مقایسه دوره‌ها</h2>
          <div className="flex gap-2">
            {['monthly', 'yearly'].map((p) => (
              <button
                key={p}
                onClick={() => setCompPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  compPeriod === p
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {p === 'monthly' ? 'ماهانه' : 'سالانه'}
              </button>
            ))}
          </div>
        </div>

        {compLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : comparison ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { key: 'revenue', label: 'درآمد', format: (v) => formatPrice(v) + ' تومان' },
                { key: 'orders', label: 'سفارشات', format: (v) => v.toLocaleString() },
                { key: 'items', label: 'اقلام فروخته شده', format: (v) => v.toLocaleString() },
              ].map(({ key, label, format: fmt }) => (
                <div key={key} className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-4">
                  <div className="text-sm text-slate-500 mb-1">{label}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {fmt(comparison.current[key])}
                    </div>
                    <div className={`flex items-center text-xs font-medium ${comparison.changes[key] >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {comparison.changes[key] >= 0 ? <ArrowUpLeft className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                      {Math.abs(comparison.changes[key])}%
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    دوره قبل: {fmt(comparison.previous[key])}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { name: comparison.previous.label, درآمد: comparison.previous.revenue, سفارشات: comparison.previous.orders },
                  { name: comparison.current.label, درآمد: comparison.current.revenue, سفارشات: comparison.current.orders },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="درآمد" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="سفارشات" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
      </div>

      {/* Custom Report Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            گزارش سفارشی
          </h2>
          {reportData && (
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              <Download className="h-4 w-4" />
              دانلود CSV
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">از تاریخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">تا تاریخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">گروه‌بندی</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {GROUP_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={loadReport}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'در حال بارگذاری...' : 'دریافت گزارش'}
          </button>
        </div>

        {reportData && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'تعداد سفارشات', value: reportData.summary.total_orders.toLocaleString() },
                { label: 'درآمد کل', value: formatPrice(reportData.summary.total_revenue) + ' ت' },
                { label: 'اقلام فروخته شده', value: reportData.summary.total_items.toLocaleString() },
                { label: 'میانگین ارزش سفارش', value: formatPrice(reportData.summary.avg_order_value) + ' ت' },
              ].map((s, i) => (
                <div key={i} className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-3">
                  <div className="text-xs text-slate-500">{s.label}</div>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            {reportData.data.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="درآمد" dot={false} />
                    <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} name="سفارشات" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Data Table */}
            {reportData.data.length > 0 && (
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>تاریخ</th>
                      <th>درآمد</th>
                      <th>سفارشات</th>
                      <th>اقلام</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.data.map((row, i) => (
                      <tr key={i}>
                        <td className="font-mono text-xs">{row.date}</td>
                        <td className="font-medium">{formatPrice(row.revenue)} تومان</td>
                        <td>{row.orders}</td>
                        <td>{row.items}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
