import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  User,
  Clock,
  Tag,
  Share2,
  FileQuestion,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { blogAPI } from '../services/api';
import { formatDate } from '../lib/formatDate';
import Skeleton from '../components/ui/Skeleton';
import { BlogPostSEO } from '../lib/seo';

const estimateReadingMinutes = (text = '') => {
  const plain = String(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = plain ? plain.split(' ').length : 0;
  return Math.max(1, Math.ceil(words / 180));
};

const isHtmlContent = (content = '') => /<\/?[a-z][\s\S]*>/i.test(content);

const renderPlainContent = (content = '') => {
  const blocks = content
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return (
      <p className="text-muted-foreground">محتوایی برای این مطلب ثبت نشده است.</p>
    );
  }

  return blocks.map((block, idx) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    // Simple markdown-ish headings
    if (lines[0]?.startsWith('## ')) {
      return (
        <h2 key={idx} className="mt-10 mb-4 text-2xl font-bold tracking-tight">
          {lines[0].replace(/^##\s+/, '')}
        </h2>
      );
    }
    if (lines[0]?.startsWith('# ')) {
      return (
        <h2 key={idx} className="mt-10 mb-4 text-2xl font-bold tracking-tight">
          {lines[0].replace(/^#\s+/, '')}
        </h2>
      );
    }
    if (lines.every((l) => l.startsWith('- ') || l.startsWith('• '))) {
      return (
        <ul key={idx} className="my-5 list-disc space-y-2 pr-5 text-muted-foreground">
          {lines.map((l, i) => (
            <li key={i} className="leading-relaxed">
              {l.replace(/^[-•]\s+/, '')}
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p key={idx} className="mb-5 text-base leading-[1.9] text-foreground/90 sm:text-lg">
        {lines.join(' ')}
      </p>
    );
  });
};

const BlogPostPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const res = await blogAPI.getPost(slug);
        setPost(res.data);

        // Related posts from same category (or latest)
        try {
          const listRes = await blogAPI.getPosts({ is_published: true });
          const all = listRes.data.results || listRes.data || [];
          const others = all.filter((p) => p.slug !== res.data.slug);
          const sameCat = others.filter(
            (p) => p.category_name && p.category_name === res.data.category_name
          );
          setRelated((sameCat.length ? sameCat : others).slice(0, 3));
        } catch {
          setRelated([]);
        }
      } catch (err) {
        console.error('Error fetching blog post:', err);
        setPost(null);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  const readingMinutes = useMemo(
    () => estimateReadingMinutes(post?.content || post?.excerpt || ''),
    [post]
  );

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: post?.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* ignore */
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" aria-hidden="true">
        <Skeleton className="h-64 rounded-none sm:h-80" />
        <div className="container mx-auto max-w-3xl space-y-4 px-4 py-10">
          <Skeleton className="h-8 w-2/3 rounded-xl" />
          <Skeleton className="h-4 w-1/3 rounded-lg" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-[70vh]">
        <EmptyState
          icon={FileQuestion}
          badge="مقاله"
          title="مقاله مورد نظر یافت نشد"
          description="این مقاله حذف شده یا هنوز منتشر نشده است. مقالات دیگر مجله را ببینید."
          primaryLabel="بازگشت به مجله"
          primaryTo="/blog"
          secondaryLabel="مشاهده محصولات"
          secondaryTo="/products"
          accent="from-amber-500/15 via-orange-500/10 to-yellow-500/10"
        />
      </div>
    );
  }

  const cover =
    post.image ||
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=900&fit=crop';

  return (
    <div className="min-h-screen pb-16">
      <BlogPostSEO post={post} />
      {/* Hero cover */}
      <section className="relative overflow-hidden">
        <div className="relative h-[42vh] min-h-[280px] max-h-[480px] sm:h-[48vh]">
          <img
            src={cover}
            alt={post.title}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              e.target.src =
                'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=900&fit=crop';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-background/40" />
        </div>

        <div className="container relative z-10 mx-auto -mt-28 max-w-3xl px-4 sm:-mt-36">
          <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground animate-fade-in">
            <Link to="/" className="transition-colors hover:text-foreground">
              خانه
            </Link>
            <ChevronLeft className="h-3.5 w-3.5 opacity-50" />
            <Link to="/blog" className="transition-colors hover:text-foreground">
              مجله
            </Link>
            {post.category_name && (
              <>
                <ChevronLeft className="h-3.5 w-3.5 opacity-50" />
                <span>{post.category_name}</span>
              </>
            )}
          </nav>

          <div className="animate-fade-in-up rounded-[1.75rem] border border-border/40 bg-card/80 p-6 shadow-2xl shadow-black/[0.06] backdrop-blur-xl dark:border-white/[0.08] dark:bg-card/70 sm:p-8">
            {post.category_name && (
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <Tag className="h-3 w-3" />
                {post.category_name}
              </span>
            )}
            <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {post.excerpt}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:text-sm">
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
                {readingMinutes.toLocaleString('fa-IR')} دقیقه مطالعه
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Article body */}
      <article className="container mx-auto max-w-3xl px-4 pt-10">
        <div className="animate-fade-in-up mb-8 flex items-center justify-between gap-3" style={{ animationDelay: '0.1s' }}>
          <Button
            variant="outline"
            onClick={() => navigate('/blog')}
            className="h-10 rounded-2xl border-border/60"
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            بازگشت به مجله
          </Button>
          <Button
            variant="outline"
            onClick={handleShare}
            className="h-10 rounded-2xl border-border/60"
          >
            <Share2 className="ml-2 h-4 w-4" />
            {copied ? 'لینک کپی شد!' : 'اشتراک‌گذاری'}
          </Button>
        </div>

        <div
          className="blog-prose animate-fade-in-up rounded-[1.5rem] border border-border/40 bg-card/50 p-6 shadow-sm backdrop-blur-sm dark:border-white/[0.06] sm:p-8 md:p-10"
          style={{ animationDelay: '0.15s' }}
        >
          {isHtmlContent(post.content) ? (
            <div
              className="blog-html space-y-4 text-base leading-[1.9] sm:text-lg"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          ) : (
            renderPlainContent(post.content)
          )}
        </div>

        {/* Author card */}
        <div
          className="mt-8 animate-fade-in-up rounded-[1.5rem] border border-border/40 bg-gradient-to-l from-muted/40 to-card/60 p-5 backdrop-blur-sm dark:border-white/[0.06] sm:p-6"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900 text-lg font-bold text-white dark:bg-white dark:text-neutral-900">
              {(post.author_name || 'ت')[0]}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                نویسنده
              </p>
              <p className="text-lg font-bold">{post.author_name || 'تیم مد'}</p>
              <p className="text-sm text-muted-foreground">
                مقالات و نکات تخصصی مد و استایل
              </p>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-6 text-xl font-bold tracking-tight sm:text-2xl">
              مطالب مرتبط
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {related.map((item, idx) => (
                <Link
                  key={item.id}
                  to={`/blog/${item.slug}`}
                  className="group animate-fade-in-up overflow-hidden rounded-[1.25rem] border border-border/40 bg-card/60 shadow-sm backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl dark:border-white/[0.06]"
                  style={{ animationDelay: `${0.1 + idx * 0.06}s` }}
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    <img
                      src={
                        item.image ||
                        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop'
                      }
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 text-sm font-bold transition-colors group-hover:text-primary">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {formatDate(item.published_at)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
};

export default BlogPostPage;
