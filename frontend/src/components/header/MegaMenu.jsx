import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { groupChildren } from './navConfig';
import { cn } from '../../lib/utils';

/**
 * Premium fashion mega menu panel for a category with children.
 */
const MegaMenu = ({ category, open, onClose }) => {
  if (!category) return null;
  const children = category.children || [];
  const columns = groupChildren(children, 3);

  return (
    <div
      className={cn(
        'absolute inset-x-0 top-full z-50 origin-top transition-all duration-200',
        open
          ? 'pointer-events-auto opacity-100 translate-y-0'
          : 'pointer-events-none opacity-0 -translate-y-1'
      )}
      onMouseLeave={onClose}
    >
      <div className="border-b border-border/60 bg-background/95 shadow-xl shadow-black/5 backdrop-blur-xl dark:shadow-black/30">
        <div className="container mx-auto px-4 py-6 lg:py-8">
          <div className="grid grid-cols-12 gap-6 lg:gap-8">
            {/* Columns of subcategories */}
            <div className="col-span-12 lg:col-span-8">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600/80 dark:text-amber-400/80">
                    دسته‌بندی
                  </p>
                  <h3 className="mt-1 text-lg font-bold tracking-tight text-foreground">
                    {category.name}
                  </h3>
                </div>
                <Link
                  to={`/category/${category.slug}`}
                  onClick={onClose}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300"
                >
                  همه {category.name}
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                </Link>
              </div>

              <div
                className={cn(
                  'grid gap-6',
                  columns.length === 1 && 'grid-cols-1',
                  columns.length === 2 && 'grid-cols-2',
                  columns.length >= 3 && 'grid-cols-2 md:grid-cols-3'
                )}
              >
                {columns.map((col, colIdx) => (
                  <ul key={colIdx} className="space-y-1">
                    {col.map((child) => (
                      <li key={child.id}>
                        <Link
                          to={`/category/${child.slug}`}
                          onClick={onClose}
                          className="block rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>

            {/* Promo panel */}
            <div className="col-span-12 lg:col-span-4">
              <Link
                to={`/category/${category.slug}`}
                onClick={onClose}
                className="group relative flex h-full min-h-[160px] overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent p-5 transition-transform hover:scale-[1.01]"
              >
                <div className="relative z-10 flex flex-col justify-between">
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    <Sparkles className="h-3 w-3" />
                    کالکشن ویژه
                  </span>
                  <div>
                    <p className="text-base font-bold tracking-tight text-foreground">
                      کشف {category.name}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      جدیدترین استایل‌ها و ترندهای این فصل را ببینید.
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      مشاهده کالکشن
                      <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                    </span>
                  </div>
                </div>
                <div className="pointer-events-none absolute -left-8 -bottom-10 h-40 w-40 rounded-full bg-amber-500/15 blur-3xl" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MegaMenu;
