import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  User,
  Clock,
  Tag,
  ArrowLeft,
  BookOpen,
  Search,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { blogAPI } from '../services/api';
import { formatDate } from '../lib/formatDate';

const estimateReadingMinutes = (text = '') => {
  const plain = String(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = plain ? plain.split(' ').length : 0;
  return Math.max(1, Math.ceil(words / 180));
};

const BlogCard = ({ post, featured = false, index = 0 }) => {
  const cover =
    post.image ||
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=500&fit=crop';
  const minutes = estimateReadingMinutes(post.excerpt || post.title);

  if (featured) {
    return (
      <Link
        to={`/blog/${post.slug}`}
        className="group relative grid animate-fade-in-up grid-cols-1 overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 shadow-2xl shadow-black/[0.12] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/20 dark:border-white/[0.10] md:grid-cols-2"
        style={{ animationDelay: '0.05s' }}
      >
        <div className="relative h-56 overflow-hidden md:h-full md:min-h-[340px]">
          <img
            src={cover}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => {
              e.target.src =
                'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=500&fit=crop';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent md:bg-gradient-to-l" />
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/80 px-3 py-1 text-[11px] font-black text-neutral-900 shadow-lg backdrop-blur-xl dark:bg-white/15 dark:text-white">
            <Sparkles className="h-3 w-3 text-amber-500" />
            ویژه
          </span>
        </div>
        <div className="flex flex-col justify-center p-6 sm:p-8 md:p-10">
          {post.category_name && (
            <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary ring-1 ring-primary/20 backdrop-blur-sm">
              <Tag className="h-3 w-3" />
              {post.category_name}
            </span>
          )}
          <h2 className="text-2xl font-black leading-tight tracking-tight transition-colors group-hover:text-primary sm:text-3xl">
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {post.excerpt}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground/80 sm:text-sm">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {post.author_name || 'تیم مد'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(post.published_at)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {minutes.toLocaleString('fa-IR')} دقیقه
            </span>
          </div>
          <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-foreground transition-all group-hover:-translate-x-1">
            ادامه مطلب
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex h-full animate-fade-in-up flex-col overflow-hidden rounded-[1.5rem] border border-white/20 bg-white/10 shadow-lg shadow-black/[0.06] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 hover:border-white/30 hover:shadow-2xl hover:shadow-black/[0.10] dark:border-white/[0.08] dark:hover:border-white/20"
      style={{ animationDelay: `${0.08 + index * 0.05}s` }}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <img
          src={cover}
          alt={post.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          onError={(e) => {
            e.target.src =
              'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=500&fit=crop';
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        {post.category_name && (
          <span className="mb-2.5 inline-flex w-fit items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground ring-1 ring-white/10 backdrop-blur-sm">
            <Tag className="h-3 w-3" />
            {post.category_name}
          </span>
        )}
        <h3 className="line-clamp-2 text-base font-bold leading-snug tracking-tight transition-colors group-hover:text-primary sm:text-lg">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground/80">
            {post.excerpt}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-muted-foreground/70">
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" />
            {post.author_name || 'تیم مد'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(post.published_at)}
          </span>
        </div>
      </div>
    </Link>
  );
};

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('همه');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postsRes, catsRes] = await Promise.all([
          blogAPI.getPosts({ is_published: true }),
          blogAPI.getCategories(),
        ]);
        setPosts(postsRes.data.results || postsRes.data || []);
        setCategories(catsRes.data.results || catsRes.data || []);
      } catch (error) {
        console.error('Error fetching blog data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredPosts = useMemo(() => {
    let list = posts;
    if (activeCategory !== 'همه') {
      list = list.filter((p) => p.category_name === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.excerpt?.toLowerCase().includes(q) ||
          p.category_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [posts, activeCategory, search]);

  const featuredPost = filteredPosts[0];
  const gridPosts = filteredPosts.slice(featuredPost ? 1 : 0);

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="h-48 animate-pulse bg-muted/50 sm:h-56" />
        <div className="container mx-auto space-y-6 px-4 py-10">
          <div className="h-56 animate-pulse rounded-[2rem] bg-muted/30 backdrop-blur-sm md:h-72" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-[1.5rem] bg-muted/30 backdrop-blur-sm" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden pb-16">
      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-40 top-20 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -right-40 top-60 h-96 w-96 rounded-full bg-amber-500/8 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-rose-500/8 blur-3xl" />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-muted/40 to-background py-14 sm:py-18">
        <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="container relative mx-auto px-4 text-center">
          <div className="mb-4 inline-flex animate-fade-in items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold backdrop-blur-2xl shadow-lg">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            مجله مد و استایل
          </div>
          <h1 className="animate-fade-in-up text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
            مجله مد
          </h1>
          <p
            className="mx-auto mt-3 max-w-xl animate-fade-in-up text-sm leading-relaxed text-muted-foreground/80 sm:text-base"
            style={{ animationDelay: '0.08s' }}
          >
            آخرین اخبار، ترندها و نکات مد و فشن را بخوانید و استایل‌تان را الهام بگیرید
          </p>

          <div
            className="relative mx-auto mt-7 max-w-md animate-fade-in-up"
            style={{ animationDelay: '0.12s' }}
          >
            <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در مقالات..."
              className="h-12 rounded-2xl border border-white/20 bg-white/10 pr-10 text-foreground shadow-lg backdrop-blur-2xl placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 sm:py-12">
        {/* Categories */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <Button
            variant={activeCategory === 'همه' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('همه')}
            className={`rounded-full px-4 transition-all ${
              activeCategory !== 'همه'
                ? 'border-white/20 bg-white/10 text-foreground backdrop-blur-xl hover:bg-white/20'
                : ''
            }`}
          >
            همه
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={activeCategory === cat.name ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(cat.name)}
              className={`rounded-full px-4 transition-all ${
                activeCategory !== cat.name
                  ? 'border-white/20 bg-white/10 text-foreground backdrop-blur-xl hover:bg-white/20'
                  : ''
              }`}
            >
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Featured */}
        {featuredPost && (
          <div className="mb-10">
            <BlogCard post={featuredPost} featured />
          </div>
        )}

        {/* Grid */}
        {gridPosts.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {gridPosts.map((post, idx) => (
              <BlogCard key={post.id} post={post} index={idx} />
            ))}
          </div>
        ) : !featuredPost ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-2xl">
              <BookOpen className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground/70">مقاله‌ای یافت نشد</p>
            {(search || activeCategory !== 'همه') && (
              <Button
                variant="outline"
                className="mt-4 rounded-2xl border-white/20 bg-white/10 backdrop-blur-xl hover:bg-white/20"
                onClick={() => {
                  setSearch('');
                  setActiveCategory('همه');
                }}
              >
                پاک کردن فیلتر
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default BlogPage;
