import {
  Package, Clock, CheckCircle, Truck, XCircle, RotateCcw,
  Loader, Wallet
} from 'lucide-react';

export const STATUS_CONFIG = {
  pending: {
    label: 'در انتظار پرداخت',
    icon: Clock,
    bg: 'bg-amber-500/12',
    text: 'text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-500/25',
    accent: 'from-amber-500 to-orange-400',
    rail: 'from-amber-500 to-orange-400',
    step: 0,
  },
  processing: {
    label: 'در حال پردازش',
    icon: Loader,
    bg: 'bg-blue-500/12',
    text: 'text-blue-700 dark:text-blue-300',
    ring: 'ring-blue-500/25',
    accent: 'from-blue-500 to-cyan-400',
    rail: 'from-blue-500 to-cyan-400',
    step: 1,
  },
  shipped: {
    label: 'ارسال شده',
    icon: Truck,
    bg: 'bg-violet-500/12',
    text: 'text-violet-700 dark:text-violet-300',
    ring: 'ring-violet-500/25',
    accent: 'from-violet-500 to-purple-400',
    rail: 'from-violet-500 to-purple-400',
    step: 2,
  },
  delivered: {
    label: 'تحویل داده شده',
    icon: CheckCircle,
    bg: 'bg-emerald-500/12',
    text: 'text-emerald-700 dark:text-emerald-300',
    ring: 'ring-emerald-500/25',
    accent: 'from-emerald-500 to-teal-400',
    rail: 'from-emerald-500 to-teal-400',
    step: 3,
  },
  cancelled: {
    label: 'لغو شده',
    icon: XCircle,
    bg: 'bg-red-500/12',
    text: 'text-red-700 dark:text-red-300',
    ring: 'ring-red-500/25',
    accent: 'from-red-500 to-rose-400',
    rail: 'from-red-500 to-rose-400',
    step: -1,
  },
  returned: {
    label: 'مرجوع شده',
    icon: RotateCcw,
    bg: 'bg-orange-500/12',
    text: 'text-orange-700 dark:text-orange-300',
    ring: 'ring-orange-500/25',
    accent: 'from-orange-500 to-amber-400',
    rail: 'from-orange-500 to-amber-400',
    step: -1,
  },
};

export const PAYMENT_CONFIG = {
  unpaid:   { label: 'پرداخت نشده',   tone: 'text-red-600 dark:text-red-400',   dot: 'bg-red-500',   bg: 'bg-red-500/10 ring-red-500/20' },
  paid:     { label: 'پرداخت شده',    tone: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10 ring-emerald-500/20' },
  refunded: { label: 'بازپرداخت شده', tone: 'text-amber-600 dark:text-amber-400',  dot: 'bg-amber-500', bg: 'bg-amber-500/10 ring-amber-500/20' },
};

export const PAYMENT_METHOD_LABELS = {
  online: 'پرداخت آنلاین',
  cash_on_delivery: 'پرداخت در محل',
  card: 'کارت به کارت',
};

export const JOURNEY_STEPS = [
  { key: 'pending', label: 'ثبت', icon: Clock },
  { key: 'processing', label: 'پردازش', icon: Package },
  { key: 'shipped', label: 'ارسال', icon: Truck },
  { key: 'delivered', label: 'تحویل', icon: CheckCircle },
];
