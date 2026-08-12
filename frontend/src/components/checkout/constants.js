import { CreditCard } from 'lucide-react';

export const EMPTY_ADDRESS = {
  full_name: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
};

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMAIL_INVALID_MSG =
  'فرمت ایمیل صحیح نیست؛ لطفاً یک ایمیل معتبر مانند example@mail.com وارد کنید.';

export const PAYMENT_METHODS = [
  {
    id: 'online',
    label: 'پرداخت آنلاین',
    desc: 'درگاه امن · پرداخت آنی',
    icon: CreditCard,
    accent: 'from-blue-500/15 to-cyan-500/10 border-blue-500/30',
    iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  },
];
