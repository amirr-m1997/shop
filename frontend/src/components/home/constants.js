import {
  Star, Quote, Truck, Shield, RotateCcw,
  Headphones, Send, CheckCircle, Heart, Clock,
} from 'lucide-react';

export const ICON_MAP = {
  Truck, Shield, RotateCcw, Headphones, Star, Quote, Send, CheckCircle, Heart, Clock,
};

export const ACCENT_COLORS = {
  discount: 'destructive',
  new: 'blue-500',
  trending: 'amber-500',
  featured: 'purple-500',
  category: 'green-500',
  brand: 'primary',
  name: 'cyan-500',
};

export const SECTION_LINKS = {
  discount: '/sale',
  new: '/new-arrivals',
  trending: '/trending',
  category: (val) => `/category/${val}`,
  brand: '/products',
  featured: '/products',
  name: (val) => `/products?search=${encodeURIComponent(val)}`,
};
