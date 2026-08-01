import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Mail, Phone, MapPin, Send, CheckCircle, ChevronLeft, ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { pagesAPI } from '../services/api';

const Telegram = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const Twitter = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

/* ── Accordion Section for Mobile ── */
const FooterAccordion = ({ title, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-b-0 lg:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-right lg:hidden"
        aria-expanded={open}
      >
        <span className="text-base font-bold">{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {/* Desktop: always visible title */}
      <h4 className="hidden lg:block font-bold mb-4 text-lg">{title}</h4>
      {/* Mobile: collapsible | Desktop: always visible */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out lg:!max-h-none lg:!opacity-100 ${
          open ? 'max-h-[500px] opacity-100 pb-4' : 'max-h-0 opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [contactInfo, setContactInfo] = useState(null);

  const currentYearJalali = (() => {
    const d = new Date();
    const gd = d.getDate();
    const gm = d.getMonth() + 1;
    const gy = d.getFullYear();
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy, days = 355666 + (365 * gy) + Math.floor(((gy > 2 ? gy + 1 : gy) + 3) / 4) - Math.floor(((gy > 2 ? gy + 1 : gy) + 99) / 100) + Math.floor(((gy > 2 ? gy + 1 : gy) + 399) / 400) + gd + g_d_m[gm - 1];
    jy = -1595 + (33 * Math.floor(days / 12053));
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) { jy += Math.floor((days - 1) / 365); }
    return jy;
  })();

  useEffect(() => {
    pagesAPI.getContactInfo()
      .then(res => setContactInfo(res.data))
      .catch(() => {});
  }, []);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  const siteName = contactInfo?.site_name || 'فروشگاه مد';
  const siteDesc = contactInfo?.site_description || 'مقصد شما برای کشف جدیدترین مد‌ها و استایل‌های روز دنیا.';
  const phone = contactInfo?.phone1 || '۰۲۱-۱۲۳۴۵۶۷۸';
  const emailAddr = contactInfo?.email1 || 'info@fashion.com';
  const address = contactInfo?.address || 'تهران، ایران';
  const instagramUrl = contactInfo?.instagram_url || '#';
  const telegramUrl = contactInfo?.telegram_url || '#';
  const twitterUrl = contactInfo?.twitter_url || '#';

  const quickLinks = [
    { to: '/', label: 'خانه' },
    { to: '/products', label: 'فروشگاه' },
    { to: '/new-arrivals', label: 'جدیدترین‌ها' },
    { to: '/sale', label: 'تخفیف‌ها' },
    { to: '/size-finder', label: 'راهنمای سایز' },
    { to: '/blog', label: 'مجله مد' },
  ];

  const serviceLinks = [
    { to: '/contact', label: 'تماس با ما' },
    { to: '/shipping', label: 'ارسال و تحویل' },
    { to: '/returns', label: 'بازگشت کالا' },
    { to: '/faq', label: 'سوالات متداول' },
    { to: '/about', label: 'درباره ما' },
  ];

  return (
    <footer className="bg-background text-foreground border-t border-border">
      {/* Newsletter Banner */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-8 sm:py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-right">
              <h3 className="text-lg sm:text-xl font-bold mb-1">در جریان مد بمانید</h3>
              <p className="text-sm text-muted-foreground">کالکشن‌های جدید و پیشنهادهای اختصاصی، مستقیم برای شما.</p>
            </div>
            <form onSubmit={handleSubscribe} className="flex gap-2 w-full md:w-auto max-w-md md:max-w-none">
              <Input
                type="email"
                placeholder="نشانی ایمیل شما"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary flex-1 md:w-72"
              />
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold shrink-0">
                {subscribed ? <CheckCircle className="h-4 w-4" /> : <Send className="h-4 w-4 ml-1" />}
                <span className="hidden sm:inline">{subscribed ? 'عضویت شما ثبت شد' : 'عضویت'}</span>
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 lg:gap-8">
          {/* Brand — always visible */}
          <div className="pb-6 lg:pb-0">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 lg:mb-4">{siteName}</h3>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              {siteDesc}
            </p>
            <div className="flex gap-3">
              {instagramUrl && instagramUrl !== '#' && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer"
                  className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-all hover:scale-110" title="اینستاگرام">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {telegramUrl && telegramUrl !== '#' && (
                <a href={telegramUrl} target="_blank" rel="noopener noreferrer"
                  className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-all hover:scale-110" title="تلگرام">
                  <Telegram className="h-5 w-5" />
                </a>
              )}
              {twitterUrl && twitterUrl !== '#' && (
                <a href={twitterUrl} target="_blank" rel="noopener noreferrer"
                  className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-all hover:scale-110" title="توییتر">
                  <Twitter className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links — accordion on mobile */}
          <FooterAccordion title="دسترسی سریع">
            <ul className="space-y-2.5 lg:space-y-3">
              {quickLinks.map((link, i) => (
                <li key={i}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group py-1">
                    <ChevronLeft className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterAccordion>

          {/* Customer Service — accordion on mobile */}
          <FooterAccordion title="خدمات مشتریان">
            <ul className="space-y-2.5 lg:space-y-3">
              {serviceLinks.map((link, i) => (
                <li key={i}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 group py-1">
                    <ChevronLeft className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterAccordion>

          {/* Contact — accordion on mobile */}
          <FooterAccordion title="تماس با ما">
            <ul className="space-y-3.5 lg:space-y-4">
              <li className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">تلفن تماس</p>
                  <p className="text-sm" dir="ltr">{phone}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">ایمیل</p>
                  <p className="text-sm" dir="ltr">{emailAddr}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">آدرس</p>
                  <p className="text-sm">{address}</p>
                </div>
              </li>
            </ul>
          </FooterAccordion>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground text-center sm:text-right">
            &copy; {currentYearJalali.toLocaleString('fa-IR')} {siteName}. تمامی حقوق محفوظ است.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>حریم خصوصی</span>
            <span>شرایط استفاده</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
