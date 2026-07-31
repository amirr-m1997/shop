import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';
import AmbientMesh from './AmbientMesh';
import SectionHeader from './SectionHeader';

const TrendsSection = ({ styles }) => {
  if (!styles.length) return null;
  const items = styles.slice(0, 4);

  return (
    <section className="relative overflow-hidden border-y border-border/40 bg-muted/30 py-16 sm:py-20">
      <AmbientMesh />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(128,128,128,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.15) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        aria-hidden
      />

      <div className="container relative mx-auto px-4">
        <SectionHeader
          eyebrow="استایل"
          title={
            <span className="flex items-center gap-2.5">
              <Sparkles className="h-7 w-7 text-amber-500" />
              ترندهای روز
            </span>
          }
          subtitle="الهام از استایل‌های تازه — برای کسانی که جلوتر از زمان حرکت می‌کنند"
          accent="bg-amber-400"
          action={
            <Link
              to={`/style/${items[0]?.slug}`}
              className="group inline-flex items-center gap-1.5 rounded-2xl border border-border bg-background/60 px-4 py-2.5 text-sm font-bold text-foreground backdrop-blur-md transition-all hover:bg-background"
            >
              استایل‌های ویژه
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </Link>
          }
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {items.map((item, idx) => (
            <Link
              key={item.id}
              to={item.link || `/style/${item.slug}`}
              className="group relative overflow-hidden rounded-[1.35rem]"
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              <div className="aspect-[3/4] overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-amber-500/30 to-violet-500/20" />
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <span className="mb-1.5 block text-[10px] font-bold tracking-widest text-amber-300/90">
                  ۰{(idx + 1).toLocaleString('fa-IR')}
                </span>
                <h3 className="text-base font-black text-white sm:text-lg">{item.title}</h3>
                <p className="mt-1 flex items-center gap-1 text-xs text-white/60 transition-colors group-hover:text-white">
                  مشاهده استایل
                  <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
                </p>
              </div>
              <div className="pointer-events-none absolute inset-0 rounded-[1.35rem] ring-1 ring-black/10 transition-all duration-500 group-hover:ring-2 group-hover:ring-amber-400/40" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendsSection;
