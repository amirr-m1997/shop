import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const StylesOfDay = ({ styles = [] }) => {
  if (!styles || styles.length === 0) return null;

  return (
    <section className="py-8 sm:py-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1.5 rounded-full bg-pink-500" />
            <h2 className="text-xl sm:text-2xl font-black">استایل‌های روز</h2>
          </div>
          <Link
            to="/lookbook"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            مشاهده همه <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {styles.map((style) => (
            <Link
              key={style.id}
              to={style.link || '/lookbook'}
              className="group relative overflow-hidden rounded-2xl aspect-[3/4] block"
            >
              <img
                src={style.image}
                alt={style.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=1000&fit=crop';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute bottom-0 right-0 left-0 p-3 sm:p-4">
                <h3 className="text-sm sm:text-base font-bold text-white">{style.title}</h3>
                {style.description && (
                  <p className="text-xs text-white/75 mt-1 line-clamp-2 hidden sm:block">
                    {style.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StylesOfDay;
