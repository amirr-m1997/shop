import { useEffect, useMemo, useState } from 'react';
import { homeAPI, pagesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { usePersonalizedRecommendations } from '../queries/personalizationQueries';
import ProductCarousel from '../components/ProductCarousel';
import BannerSlider from '../components/BannerSlider';
import AmbientMesh from '../components/home/AmbientMesh';
import StaticHero from '../components/home/StaticHero';
import PromoBanners from '../components/home/PromoBanners';
import CategoriesSection from '../components/home/CategoriesSection';
import TrendsSection from '../components/home/TrendsSection';
import CtaBand from '../components/home/CtaBand';
import TestimonialsSection from '../components/home/TestimonialsSection';
import HomeSkeleton from '../components/home/HomeSkeleton';
import PersonalizedSection from '../components/home/PersonalizedSection';
import { ACCENT_COLORS, SECTION_LINKS } from '../components/home/constants';
import { SEO } from '../lib/seo';

/* ═══════════════════════════════════════
   Main Homepage
   ═══════════════════════════════════════ */
const HomePage = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [sections, setSections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [styles, setStyles] = useState([]);
  const [banners, setBanners] = useState([]);
  const [settings, setSettings] = useState({});
  const [features, setFeatures] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [testimonialForm, setTestimonialForm] = useState({
    name: '',
    role: '',
    text: '',
    rating: 5,
  });
  const [testimonialSubmitting, setTestimonialSubmitting] = useState(false);
  const [testimonialSubmitted, setTestimonialSubmitted] = useState(false);

  const personalizationQuery = usePersonalizedRecommendations({
    enabled: isAuthenticated && !authLoading,
    limit: 8,
  });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await homeAPI.getHomeData();
        const data = res.data;
        setBanners(data.banners || []);
        setCategories(data.categories || []);
        setSettings(data.settings || {});
        setStyles(data.styles || []);
        setSections(data.sections || []);
        setTestimonials(data.testimonials || []);
        setFeatures(data.features || []);
      } catch (error) {
        console.error('Error fetching homepage data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (testimonials.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const getViewAllLink = (section) => {
    const link = SECTION_LINKS[section.filter_type];
    if (typeof link === 'function') return link(section.filter_value);
    return link || '/products';
  };

  const fallbackProducts = useMemo(() => {
    const fallbackSection = sections.find((section) => section.products?.length);
    return fallbackSection?.products || [];
  }, [sections]);

  const personalizedProducts = personalizationQuery.data?.length
    ? personalizationQuery.data
    : fallbackProducts;

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

  if (loading) return <HomeSkeleton />;

  return (
    <div className="min-h-screen">
      <SEO
        title="فروشگاه آنلاین پوشاک مردانه و زنانه"
        description="فروشگاه آنلاین پوشاک مردانه و زنانه | جدیدترین مدل‌های روز با بهترین قیمت و کیفیت | ارسال رایگان برای سفارش‌های بالای ۵۰۰ هزار تومان"
        type="website"
      >
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'فروشگاه مد',
            url: 'https://fashionshop.ir',
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://fashionshop.ir/products?search={search_term_string}',
              },
              'query-input': 'required name=search_term_string',
            },
          })}
        </script>
      </SEO>
      {/* ═══ HERO (rounded card + glass strip) ═══ */}
      {banners.length > 0 ? (
        <BannerSlider banners={banners} features={features} />
      ) : settings.hero_title ? (
        <StaticHero settings={settings} features={features} />
      ) : null}

      {/* ═══ CATEGORIES — untouched ═══ */}
      <CategoriesSection categories={categories} />

      {/* ═══ PROMO BANNERS (Sale + New Arrivals) ═══ */}
      <PromoBanners />

      {isAuthenticated && (
        <PersonalizedSection
          products={personalizedProducts}
          isLoading={personalizationQuery.isLoading}
          isFallback={personalizationQuery.isError || !personalizationQuery.data?.length}
        />
      )}

      {/* ═══ LOOKBOOK / TRENDS — dark editorial ═══ */}
      <TrendsSection styles={styles} />

      {/* ═══ DYNAMIC PRODUCT SECTIONS ═══ */}
      <div className="relative content-auto-section">
        <AmbientMesh />
        {sections.map((section, idx) => (
          <div
            key={section.id}
            className={idx % 2 === 1 ? 'bg-muted/30 dark:bg-muted/10' : ''}
          >
            <ProductCarousel
              title={section.title}
              products={section.products}
              viewAllLink={getViewAllLink(section)}
              accentColor={ACCENT_COLORS[section.filter_type] || 'primary'}
            />
          </div>
        ))}
      </div>

      {/* ═══ CTA BAND ═══ */}
      <div className="content-auto-section"><CtaBand /></div>

      {/* ═══ TESTIMONIALS ═══ */}
      <div className="content-auto-section"><TestimonialsSection
        testimonials={testimonials}
        currentTestimonial={currentTestimonial}
        setCurrentTestimonial={setCurrentTestimonial}
        showTestimonialForm={showTestimonialForm}
        setShowTestimonialForm={setShowTestimonialForm}
        testimonialForm={testimonialForm}
        setTestimonialForm={setTestimonialForm}
        testimonialSubmitting={testimonialSubmitting}
        testimonialSubmitted={testimonialSubmitted}
        handleTestimonialSubmit={handleTestimonialSubmit}
      /></div>
    </div>
  );
};

export default HomePage;
