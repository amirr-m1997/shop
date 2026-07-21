import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Target, Users, Award, Truck, ShieldCheck, Leaf } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { pagesAPI } from '../services/api';

const VALUES = [
  { icon: Heart, title: 'عشق به مد', desc: 'با عشق و دقت، بهترین مدل‌ها را برای شما انتخاب می‌کنیم' },
  { icon: Target, title: 'کیفیت بالا', desc: 'فقط محصولات با کیفیت و از برندهای معتبر' },
  { icon: Users, title: 'رضایت مشتری', desc: 'رضایت شما اولویت اصلی ماست' },
  { icon: Leaf, title: 'پایداری', desc: 'تعهد به تولید پایدار و مسئولانه' },
];

const STATS = [
  { number: '+۱۰,۰۰۰', label: 'مشتری راضی' },
  { number: '+۵۰۰', label: 'محصول متنوع' },
  { number: '+۵۰', label: 'برند معتبر' },
  { number: '۹۸٪', label: 'رضایت مشتریان' },
];

const AboutPage = () => {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    pagesAPI.getSettings().then(res => setSettings(res.data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30 z-10" />
        <img src={settings.about_image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=800&fit=crop'} alt="درباره ما" className="absolute inset-0 h-full w-full object-cover" />
        <div className="relative z-20 text-center text-white px-4">
          <h1 className="text-4xl md:text-6xl font-black mb-4">{settings.about_title || 'درباره ما'}</h1>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">{settings.about_title || 'داستان ما'}</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              {settings.about_content ? (
                settings.about_content.split('\n').map((p, i) => <p key={i}>{p}</p>)
              ) : (
                <>
                  <p>فروشگاه مد با هدف ارائه بهترین محصولات مد و فشن به مشتریان تأسیس شد.</p>
                  <p>ما باور داریم که هر کسی حق دارد با کیفیت‌ترین و شیک‌ترین لباس‌ها را با قیمت مناسب در اختیار داشته باشد.</p>
                </>
              )}
            </div>
          </div>
          {settings.about_image && (
            <div className="relative">
              <img src={settings.about_image} alt="تیم ما" className="rounded-2xl shadow-lg w-full" />
            </div>
          )}
        </div>
      </section>

      <section className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((stat, i) => (
              <div key={i}><p className="text-3xl md:text-4xl font-black mb-2">{stat.number}</p><p className="text-sm opacity-80">{stat.label}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">ارزش‌های ما</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {VALUES.map((value, i) => (
            <div key={i} className="text-center p-6 rounded-2xl bg-muted/50 hover:bg-muted transition-colors">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"><value.icon className="h-8 w-8 text-primary" /></div>
              <h3 className="text-lg font-bold mb-2">{value.title}</h3>
              <p className="text-sm text-muted-foreground">{value.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">آماده‌اید استایل خود را پیدا کنید؟</h2>
        <div className="flex gap-4 justify-center">
          <Link to="/products"><Button size="lg">مشاهده محصولات</Button></Link>
          <Link to="/contact"><Button size="lg" variant="outline">تماس با ما</Button></Link>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
