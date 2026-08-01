import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Printer, Download } from 'lucide-react';
import { ordersAPI } from '../services/api';
import { formatPrice, formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

export default function InvoicePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const handlePrint = () => {
    window.print();
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
    <div className="space-y-6">
      {/* Actions - hidden on print */}
      <div className="flex items-center gap-3 print:hidden">
        <button
          onClick={() => navigate('/orders')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowRight className="h-5 w-5 text-slate-500" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex-1">
          فاکتور {order.order_number}
        </h1>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-colors"
        >
          <Printer className="h-4 w-4" />
          چاپ فاکتور
        </button>
      </div>

      {/* Invoice */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 max-w-3xl mx-auto print:border-0 print:shadow-0 print:p-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">فروشگاه مد</h2>
            <p className="text-sm text-slate-500 mt-1">فاکتور خرید</p>
          </div>
          <div className="text-left">
            <div className="font-mono text-lg font-bold text-blue-500">{order.order_number}</div>
            <div className="text-sm text-slate-500 mt-1">{formatDate(order.created_at)}</div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-slate-500 mb-2">اطلاعات مشتری</h3>
            <div className="text-sm space-y-1 text-slate-800 dark:text-slate-100">
              <div>{order.user_username}</div>
              {order.shipping_address_detail && (
                <>
                  <div>{order.shipping_address_detail.phone}</div>
                  <div>{order.shipping_address_detail.address}</div>
                  <div>{order.shipping_address_detail.city}, {order.shipping_address_detail.state}</div>
                  <div>کد پستی: {order.shipping_address_detail.postal_code}</div>
                </>
              )}
            </div>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-slate-500 mb-2">اطلاعات پرداخت</h3>
            <div className="text-sm space-y-1 text-slate-800 dark:text-slate-100">
              <div>روش پرداخت: آنلاین</div>
              <div>وضعیت پرداخت: {order.payment_status === 'paid' ? 'پرداخت شده' : order.payment_status === 'unpaid' ? 'پرداخت نشده' : 'بازپرداخت شده'}</div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-sm mb-8">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-right py-3 font-semibold text-slate-600 dark:text-slate-300">#</th>
              <th className="text-right py-3 font-semibold text-slate-600 dark:text-slate-300">محصول</th>
              <th className="text-right py-3 font-semibold text-slate-600 dark:text-slate-300">سایز/رنگ</th>
              <th className="text-center py-3 font-semibold text-slate-600 dark:text-slate-300">تعداد</th>
              <th className="text-left py-3 font-semibold text-slate-600 dark:text-slate-300">قیمت واحد</th>
              <th className="text-left py-3 font-semibold text-slate-600 dark:text-slate-300">جمع</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item, i) => (
              <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700/50">
                <td className="py-3 text-slate-400">{i + 1}</td>
                <td className="py-3 text-slate-800 dark:text-slate-100 font-medium">{item.product_name}</td>
                <td className="py-3 text-slate-500 text-xs">{item.variant_info || '—'}</td>
                <td className="py-3 text-center text-slate-800 dark:text-slate-100">{item.quantity}</td>
                <td className="py-3 text-left text-slate-600 dark:text-slate-300">{formatPrice(item.price)} تومان</td>
                <td className="py-3 text-left font-medium text-slate-800 dark:text-slate-100">{formatPrice(item.total_price)} تومان</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">جمع کالاها</span>
              <span className="text-slate-800 dark:text-slate-100">{formatPrice(order.subtotal)} تومان</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">هزینه ارسال</span>
              <span className="text-slate-800 dark:text-slate-100">{formatPrice(order.shipping_cost)} تومان</span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">مالیات</span>
                <span className="text-slate-800 dark:text-slate-100">{formatPrice(order.tax)} تومان</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>تخفیف</span>
                <span>-{formatPrice(order.discount)} تومان</span>
              </div>
            )}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
              <div className="flex justify-between font-bold text-lg">
                <span className="text-slate-800 dark:text-slate-100">مجموع قابل پرداخت</span>
                <span className="text-blue-500">{formatPrice(order.total)} تومان</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
          <p>با تشکر از خرید شما</p>
          <p className="mt-1">تاریخ صدور فاکتور: {formatDate(order.created_at)}</p>
        </div>
      </div>
    </div>
  );
}
