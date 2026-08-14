import { Link } from 'react-router-dom';
import { Eye, ShoppingCart, Star, Trash2 } from 'lucide-react';
import { Avatar } from '../chat/ChatDomainComponents';
import { formatPrice } from '../../lib/formatPrice';
import { PLACEHOLDER_IMG } from '../../lib/placeholders';

const RoomItemCard = ({ item, canRemove, onRemove, removing }) => {
  const product = item.product || {};
  const img = product.primary_image || product.image || product.images?.[0]?.image || PLACEHOLDER_IMG;
  const unavailable = Boolean(item.is_unavailable);
  const hasDiscount = Number(product.discount_percentage) > 0;
  const compare = product.original_price || product.compare_price;
  const addedByName = item.added_by?.display_name || item.added_by?.username;

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
        unavailable
          ? 'border-border/40 opacity-80'
          : 'border-border/60 hover:border-amber-500/30 hover:shadow-amber-500/5'
      }`}
    >
      <Link
        to={`/product/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-muted/40"
        aria-label={product.name}
      >
        <img
          src={img}
          alt={product.name}
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            unavailable ? 'grayscale' : ''
          }`}
          loading="lazy"
        />
        {hasDiscount && !unavailable && (
          <span className="absolute bottom-2 left-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 px-2 py-0.5 text-[10px] font-black text-black shadow-lg">
            {product.discount_percentage}٪-
          </span>
        )}
        {unavailable && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
            <span className="rounded-xl border border-white/30 bg-black/60 px-3 py-1.5 text-[11px] font-black text-white">
              این محصول فعلاً در دسترس نیست
            </span>
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <Link to={`/product/${product.slug}`} className="block">
          <p className="line-clamp-2 text-sm font-bold leading-snug text-foreground transition group-hover:text-amber-600 dark:group-hover:text-amber-400">
            {product.name}
          </p>
          {product.brand_name && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{product.brand_name}</p>
          )}
        </Link>

        {(Number(product.rating) > 0 || Number(product.review_count) > 0) && (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            <span>{Number(product.rating).toLocaleString('fa-IR')}</span>
            {Number(product.review_count) > 0 && (
              <span>({Number(product.review_count).toLocaleString('fa-IR')})</span>
            )}
          </div>
        )}

        <div className="mt-2 flex items-baseline gap-1.5">
          {unavailable ? (
            <span className="text-sm font-black text-muted-foreground">ناموجود</span>
          ) : (
            <span className="text-base font-black text-amber-600 dark:text-amber-400 tabular-nums">
              {formatPrice(product.price)}
            </span>
          )}
          {!unavailable && compare && Number(compare) > Number(product.price) && (
            <span className="text-xs text-muted-foreground line-through tabular-nums">
              {formatPrice(compare)}
            </span>
          )}
        </div>

        {addedByName && (
          <div className="mt-2 flex items-center gap-1.5 border-t border-border/40 pt-2">
            <Avatar user={item.added_by} size={18} ring={false} />
            <span className="text-[10px] font-medium text-muted-foreground">
              افزوده‌شده توسط {addedByName}
            </span>
          </div>
        )}

        <div className="mt-2 flex items-center gap-1.5">
          <Link
            to={`/product/${product.slug}`}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-amber-500/40 bg-transparent px-2 py-1.5 text-[11px] font-bold text-amber-600 transition hover:bg-amber-500/10 dark:text-amber-400"
          >
            <Eye className="h-3.5 w-3.5" />
            مشاهده
          </Link>
          {canRemove && (
            <button
              type="button"
              onClick={() => onRemove?.(item)}
              disabled={removing}
              aria-label="حذف محصول از اتاق"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/50 text-muted-foreground transition hover:border-rose-500/40 hover:text-rose-500 active:scale-95 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <span className="pointer-events-none absolute right-2 top-2 hidden h-8 w-8 items-center justify-center rounded-full bg-white/85 text-amber-600 shadow-sm backdrop-blur transition group-hover:flex dark:bg-black/60">
        <ShoppingCart className="h-4 w-4" />
      </span>
    </div>
  );
};

export default RoomItemCard;