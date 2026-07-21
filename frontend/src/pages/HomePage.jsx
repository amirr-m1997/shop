import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { productsAPI, pagesAPI } from '../services/api';
import ProductCarousel from '../components/ProductCarousel';
import BannerSlider from '../components/BannerSlider';
import { ArrowLeft, Sparkles, Star, Quote, Truck, Shield, RotateCcw, Headphones, Send, CheckCircle } from 'lucide-react';

const ICON_MAP = {
  Truck, Shield, RotateCcw, Headphones, Star, Quote, Send, CheckCircle,
  Heart: () => <span>❤</span>,
  Clock: () => <span>🕐</span>,
};

const ACCENT_COLORS = {
  discount: 'destructive', new: 'blue-500', trending: 'amber-500',
  featured: 'purple-500', category: 'green-500', brand: 'primary', name: 'cyan-500',
};

const SECTION_LINKS = {
  discount: '/sale', new: '/new-arrivals', trending: '/trending',
  category: (val) => `/category/${val}`, brand: '/products', featured: '/products',
  name: (val) => `/products?search=${encodeURIComponent(val)}`,
};

const HomePage = () => {
  const [sections, setSections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [styles, setStyles] = useState([]);
  const [banners, setBanners] = useState([]);
  const [settings, setSettings] = useState({});
  const [features, setFeatures] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Testimonial form state
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [testimonialForm, setTestimonialForm] = useState({ name: '', role: '', text: '', rating: 5 });
  const [testimonialSubmitting, setTestimonialSubmitting] = useState(false);
  const [testimonialSubmitted, setTestimonialSubmitted] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sectionsRes, catsRes, settingsRes, stylesRes, bannersRes, testimonialsRes, featuresRes] = await Promise.all([
          productsAPI.getHomepageSections(),
          productsAPI.getCategories(),
          pagesAPI.getSettings(),
          productsAPI.getStyles(),
          productsAPI.getBanners(),
          pagesAPI.getTestimonials(),
          pagesAPI.getFeatures(),
        ]);
        setSections(sectionsRes.data);
        const allCats = catsRes.data.results || catsRes.data || [];
        setCategories(allCats.filter(c => !c.parent));
        setSettings(settingsRes.data);
        setStyles(stylesRes.data || []);
        setBanners(bannersRes.data);
        const tData = testimonialsRes.data.results || testimonialsRes.data || [];
        setTestimonials(tData);
        setFeatures(featuresRes.data.results || featuresRes.data || []);
      } catch (error) {
        console.error('Error fetching homepage data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    if (testimonials.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const getViewAllLink = (section) => {
    const link = SECTION_LINKS[section.filter_type];
    if (typeof link === 'function') return link(section.filter_value);
    return link || '/products';
  };

  const heroImage = settings.hero_image || '';

  const handleTestimonialSubmit = async (e) => {
    e.preventDefault();
    if (!testimonialForm.name.trim() || !testimonialForm.text.trim()) return;
    setTestimonialSubmitting(true);
    try {
      await pagesAPI.submitTestimonial(testimonialForm);
      setTestimonialSubmitted(true);
      setTestimonialForm({ name: '', role: '', text: '', rating: 5 });
      setTimeout(() => {
        setTestimonialSubmitted(false);
        setShowTestimonialForm(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting testimonial:', error);
    } finally {
      setTestimonialSubmitting(false);
    }
  };

  const getIconComponent = (iconName) => {
    return ICON_MAP[iconName] || Truck;
  };

  return (
    <div className="min-h-screen">
      {/* ═══ HERO / BANNER SECTION ═══ */}
      {!loading && banners.length > 0 && (
        <BannerSlider banners={banners} />
      )}
      {!loading && banners.length === 0 && settings.hero_title && (
        <section className="relative h-[420px] sm:h-[520px] md:h-[600px] overflow-hidden">
          {heroImage && (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/40 to-black/20 z-10" />
              <img src={heroImage} alt={settings.hero_title} className="absolute inset-0 h-full w-full object-cover" />
            </>
          )}
          <div className="relative z-20 h-full flex items-center justify-center text-center text-white px-4">
            <div className="max-w-3xl">
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-black mb-4 sm:mb-6 leading-tight">
                {settings.hero_title}
              </h1>
              {settings.hero_subtitle && (
                <p className="text-base sm:text-xl md:text-2xl mb-6 sm:mb-8 opacity-90">
                  {settings.hero_subtitle}
                </p>
              )}
              <div className="flex gap-3 sm:gap-4 justify-center flex-wrap">
                <Button asChild size="lg" variant="outline" className="border-foreground/50 text-foreground hover:text-white hover:bg-white/10">
                  <Link to="/products">خرید کنید</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ FEATURES BAR (from DB) ═══ */}
      {features.length > 0 && (
        <section className="border-b bg-background/80 backdrop-blur-sm mt-6 md:sticky md:top-16 md:z-40">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
              {features.map((f) => {
                const IconComp = getIconComponent(f.icon);
                return (
                  <div key={f.id} className="flex items-center gap-3 py-4 px-4 hover:bg-muted/50 transition-colors">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${f.bg_color} shrink-0`}>
                      <IconComp className={`h-5 w-5 ${f.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{f.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{f.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══ CATEGORIES ═══ */}
      <section className="container mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-1.5 rounded-full bg-primary" />
          <h2 className="text-2xl sm:text-3xl font-black">دسته‌بندی‌ها</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger-children">
          {categories.map((cat) => (
            <Link key={cat.id} to={`/category/${cat.slug}`}>
              <div className="relative overflow-hidden rounded-2xl h-64 sm:h-72 md:h-80 lg:h-96 group cursor-pointer hover-lift">
                {cat.image ? (
                  <img src={cat.image} alt={cat.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 right-0 p-5 sm:p-6 w-full">
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-1">{cat.name}</h3>
                  <p className="text-sm text-white/70 flex items-center gap-1 group-hover:text-white transition-colors">
                    مشاهده محصولات <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ LOOKBOOK ═══ */}
      {styles.length > 0 && (
        <section className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-1.5 rounded-full bg-amber-500" />
            <h2 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-amber-500" />
              استایل‌های روز
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger-children">
            {styles.slice(0, 4).map(item => (
              <Link key={item.id} to={item.link || '/lookbook'}>
                <div className="relative overflow-hidden rounded-2xl h-64 sm:h-72 md:h-80 lg:h-96 group cursor-pointer hover-lift">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-amber-500/5" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 right-0 p-5 sm:p-6 w-full">
                    <h3 className="text-2xl sm:text-3xl font-black text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-white/70 flex items-center gap-1 group-hover:text-white transition-colors">
                      مشاهده استایل <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ DYNAMIC SECTIONS FROM DB ═══ */}
      {loading ? (
        <div className="space-y-8 py-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="container mx-auto px-4">
              <div className="h-6 bg-muted rounded w-48 mb-4 animate-pulse" />
              <div className="flex gap-3 overflow-hidden">
                {[1, 2, 3, 4, 5].map(j => (
                  <div key={j} className="shrink-0 w-[200px]">
                    <div className="aspect-[3/4] bg-muted rounded-lg animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        sections.map((section) => (
          <ProductCarousel key={section.id} title={section.title} products={section.products} viewAllLink={getViewAllLink(section)} accentColor={ACCENT_COLORS[section.filter_type] || 'primary'} />
        ))
      )}

      {/* ═══ TESTIMONIALS ═══ */}
      {testimonials.length > 0 && (
        <section className="py-16 bg-gradient-to-br from-muted/30 via-background to-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-primary/5 rounded-full px-4 py-2 mb-4">
                <Quote className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">نظرات مشتریان</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black">مشتریان ما چه می‌گویند؟</h2>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="relative bg-background rounded-3xl border p-8 sm:p-10 shadow-lg">
                <Quote className="h-10 w-10 text-primary/10 absolute top-6 left-6" />

                <div className="flex items-center gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-5 w-5 ${i < testimonials[currentTestimonial].rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                  ))}
                </div>

                <p className="text-lg sm:text-xl font-medium leading-relaxed mb-6 min-h-[80px]">
                  "{testimonials[currentTestimonial].text}"
                </p>

                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">{testimonials[currentTestimonial].name[0]}</span>
                  </div>
                  <div>
                    <p className="font-bold">{testimonials[currentTestimonial].name}</p>
                    <p className="text-sm text-muted-foreground">{testimonials[currentTestimonial].role || 'خریدار'}</p>
                  </div>
                </div>

                {testimonials.length > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    {testimonials.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentTestimonial(i)}
                        className={`h-2 rounded-full transition-all ${i === currentTestimonial ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Submit testimonial button / form */}
              <div className="mt-6 text-center">
                {!showTestimonialForm ? (
                  <Button variant="outline" onClick={() => setShowTestimonialForm(true)}>
                    <Quote className="h-4 w-4 ml-2" />
                    نظر شما چیست؟
                  </Button>
                ) : (
                  <div className="bg-background rounded-2xl border p-6 shadow-sm text-right">
                    {testimonialSubmitted ? (
                      <div className="flex flex-col items-center gap-3 py-4">
                        <CheckCircle className="h-12 w-12 text-green-500" />
                        <p className="text-lg font-bold">نظر شما با موفقیت ارسال شد!</p>
                        <p className="text-sm text-muted-foreground">پس از تایید ادمین، نظر شما نمایش داده خواهد شد.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleTestimonialSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium mb-1 block">نام شما *</label>
                            <Input
                              required
                              placeholder="نام خود را وارد کنید"
                              value={testimonialForm.name}
                              onChange={(e) => setTestimonialForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">سمت (اختیاری)</label>
                            <Input
                              placeholder="مثلاً خریدار دائمی"
                              value={testimonialForm.role}
                              onChange={(e) => setTestimonialForm(prev => ({ ...prev, role: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">نظر شما *</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="نظر خود را بنویسید..."
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                            value={testimonialForm.text}
                            onChange={(e) => setTestimonialForm(prev => ({ ...prev, text: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">امتیاز شما</label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setTestimonialForm(prev => ({ ...prev, rating: star }))}
                                className="p-0.5 transition-transform hover:scale-110"
                              >
                                <Star className={`h-7 w-7 ${star <= testimonialForm.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                          <Button type="button" variant="ghost" onClick={() => setShowTestimonialForm(false)}>
                            انصراف
                          </Button>
                          <Button type="submit" disabled={testimonialSubmitting}>
                            <Send className="h-4 w-4 ml-2" />
                            {testimonialSubmitting ? 'در حال ارسال...' : 'ارسال نظر'}
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;
