import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-muted/50 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-bold mb-4">فروشگاه مد</h3>
            <p className="text-muted-foreground mb-4">
              مد و فشن با کیفیت برای مردان، زنان و کودکان
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">دسترسی سریع</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-muted-foreground hover:text-primary">خانه</Link></li>
              <li><Link to="/products" className="text-muted-foreground hover:text-primary">فروشگاه</Link></li>
              <li><Link to="/lookbook" className="text-muted-foreground hover:text-primary">کتاب استایل</Link></li>
              <li><Link to="/size-finder" className="text-muted-foreground hover:text-primary">پیدا کردن سایز</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-semibold mb-4">خدمات مشتریان</h4>
            <ul className="space-y-2">
              <li><Link to="/contact" className="text-muted-foreground hover:text-primary">تماس با ما</Link></li>
              <li><Link to="/shipping" className="text-muted-foreground hover:text-primary">اطلاعات ارسال</Link></li>
              <li><Link to="/returns" className="text-muted-foreground hover:text-primary">بازگشت کالا</Link></li>
              <li><Link to="/faq" className="text-muted-foreground hover:text-primary">سوالات متداول</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4">تماس با ما</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>info@fashion.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>۰۲۱-۱۲۳۴۵۶۷۸</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>تهران، ایران</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Instagram Feed */}
<div className="mt-12 pt-8 border-t">
  <h4 className="font-semibold mb-4 text-center">ما را در اینستاگرام دنبال کنید</h4>
  <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
    {[
      'photo-1515886657613-9f3515b0c78f',
      'photo-1509631179647-0177331693ae',
      'photo-1496747611176-843222e1e57c',
      'photo-1469334031218-e382a71b716b',
//       'photo-1485230946086-1d99d5297182',
      'photo-1483985988355-763728e1935b',
      'photo-1617137968427-85924c800a22',
      'photo-1558618666-fcd25c85cd64',
    ].map((photoId, i) => (
      <a
        key={i}
        href="https://instagram.com"
        target="_blank"
        rel="noopener noreferrer"
        className="aspect-square bg-muted rounded overflow-hidden hover:opacity-80 transition-opacity"
      >
        <img
          src={`https://images.unsplash.com/${photoId}?w=200&h=200&fit=crop`}
          alt={`Instagram ${i + 1}`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </a>
    ))}
  </div>
</div>

        {/* Newsletter */}
        <div className="mt-12 pt-8 border-t">
          <div className="max-w-md mx-auto text-center">
            <h4 className="font-semibold mb-2">عضویت در خبرنامه</h4>
            <p className="text-muted-foreground mb-4">برای دریافت آخرین اخبار و پیشنهادات ویژه</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="ایمیل خود را وارد کنید"
                className="flex-1 px-4 py-2 border rounded-lg"
              />
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                عضویت
              </button>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t text-center text-muted-foreground text-sm">
          <p>&copy; ۲۰۲۴ فروشگاه مد. تمامی حقوق محفوظ است.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
