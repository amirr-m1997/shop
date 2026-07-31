import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Package, MapPin, CreditCard } from 'lucide-react';
import { ordersAPI } from '../services/api';
import { formatPrice, formatDate } from '../lib/utils';
import AdminNotes from '../components/AdminNotes';
import toast from 'react-hot-toast';

const STATUS_CHOICES = [
  { value: 'pending', label: 'در انتظار بررسی' },
  { value: 'processing', label: 'در حال پردازش' },
  { value: 'shipped', label: 'ارسال شده' },
  { value: 'delivered', label: 'تحویل داده شده' },
  { value: 'cancelled', label: 'لغو شده' },
  { value: 'returned', label: 'مرجوع شده' },
];

const PAYMENT_STATUS_CHOICES = [
  { value: 'unpaid', label: 'پرداخت نشده' },
  { value: 'paid', label: 'پرداخت شده' },
  { value: 'refunded', label: 'بازپرداخت شده' },
];

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      const res = await ordersAPI.get(id);
      setOrder(res.data);
    } catch {
      toast.error('خطا در بارگذاری سفارش');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (field, value) => {
    setUpdating(true);
    try {
      await ordersAPI.update(id, { [field]: value });
      setOrder({ ...order, [field]: value });
      toast.success('بروزرسانی شد');
    } catch {
      toast.error('خطا در بروزرسانی');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/orders')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowRight className="h-5 w-5 text-slate-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            سفارش {order.order_number}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            ثبت شده در {formatDate(order.created_at)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" />
              وضعیت سفارش
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  وضعیت سفارش
                </label>
                <select
                  value={order.status}
                  onChange={(e) => handleStatusChange('status', e.target.value)}
                  disabled={updating}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {STATUS_CHOICES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  وضعیت پرداخت
                </label>
                <select
                  value={order.payment_status}
                  onChange={(e) => handleStatusChange('payment_status', e.target.value)}
                  disabled={updating}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {PAYMENT_STATUS_CHOICES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  کد رهگیری پستی
                </label>
                <input
                  type="text"
                  value={order.postal_tracking_code || ''}
                  onChange={(e) => handleStatusChange('postal_tracking_code', e.target.value)}
                  placeholder="وارد کنید..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
              اقلام سفارش
            </h2>
            <div className="space-y-3">
              {order.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
                >
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-100">
                      {item.product_name}
                    </div>
                    {item.variant_info && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {item.variant_info}
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      {formatPrice(item.price)} تومان × {item.quantity}
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatPrice(item.total_price)} تومان
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              خلاصه پرداخت
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">جمع کالاها</span>
                <span className="text-slate-800 dark:text-slate-100">{formatPrice(order.subtotal)} تومان</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">هزینه ارسال</span>
                <span className="text-slate-800 dark:text-slate-100">{formatPrice(order.shipping_cost)} تومان</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">مالیات</span>
                  <span className="text-slate-800 dark:text-slate-100">{formatPrice(order.tax)} تومان</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>تخفیف</span>
                  <span>-{formatPrice(order.discount)} تومان</span>
                </div>
              )}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-slate-800 dark:text-slate-100">مجموع</span>
                  <span className="text-blue-500">{formatPrice(order.total)} تومان</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {order.shipping_address_detail && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                آدرس ارسال
              </h2>
              <div className="text-sm space-y-1.5 text-slate-600 dark:text-slate-300">
                <div className="font-medium">{order.shipping_address_detail.full_name}</div>
                <div>{order.shipping_address_detail.phone}</div>
                <div>{order.shipping_address_detail.address}</div>
                <div>{order.shipping_address_detail.city}, {order.shipping_address_detail.state}</div>
                <div>کد پستی: {order.shipping_address_detail.postal_code}</div>
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                یادداشت مشتری
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {order.notes}
              </p>
            </div>
          )}

          {/* Admin Notes */}
          <AdminNotes targetType="order" targetId={parseInt(id)} />
        </div>
      </div>
    </div>
  );
}
