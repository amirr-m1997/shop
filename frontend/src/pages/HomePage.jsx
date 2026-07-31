import React, { useEffect, useState } from 'react';
import { productsAPI, pagesAPI } from '../services/api';
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
import { ACCENT_COLORS, SECTION_LINKS } from '../components/home/constants';

/* ═══════════════════════════════════════
   Main Homepage
   ═══════════════════════════════════════ */
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

  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [testimonialForm, setTestimonialForm] = useState({
    name: '',
    role: '',
    text: '',
    rating: 5,
  });
  const [testimonialSubmitting, setTestimonialSubmitting] = useState(false);
  const [testimonialSubmitted, setTestimonialSubmitted] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [
          sectionsRes,
          catsRes,
          settingsRes,
          stylesRes,
          bannersRes,
          testimonialsRes,
          featuresRes,
        ] = await Promise.all([
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
        setCategories(allCats.filter((c) => !c.parent));
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

      {/* ═══ LOOKBOOK / TRENDS — dark editorial ═══ */}
      <TrendsSection styles={styles} />

      {/* ═══ DYNAMIC PRODUCT SECTIONS ═══ */}
      <div className="relative">
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
      <CtaBand />

      {/* ═══ TESTIMONIALS ═══ */}
      <TestimonialsSection
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
      />
    </div>
  );
};

export default HomePage;
