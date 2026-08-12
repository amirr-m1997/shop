import { Ban, Gift, MessageCircle, ShoppingBag, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../../lib/formatPrice';
import { PLACEHOLDER_IMG } from '../../lib/placeholders';
import { SendProductModal } from './ChatDomainComponents';

const ChatDialogs = ({
  sendProductOpen, setSendProductOpen, activeId, active, loadMessages,
  sharedOpen, setSharedOpen, sharedProducts, confirmDialog, closeConfirm,
}) => (
  <>
      <SendProductModal
        open={sendProductOpen}
        onClose={() => setSendProductOpen(false)}
        conversationId={activeId}
        onSent={() => activeId && loadMessages(activeId)}
      />

      {/* ═══ Shared products modal ═══ */}
      {sharedOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSharedOpen(false)} />
          <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-border/60 bg-card shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <ShoppingBag className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">محصولات اشتراک‌گذاری‌شده</h3>
                  <p className="text-[11px] text-muted-foreground">
                    گفتگو با {active?.other_user?.display_name || active?.other_user?.username} — {sharedProducts.length.toLocaleString('fa-IR')} محصول
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSharedOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
              {sharedProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Gift className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-foreground">هنوز محصولی به اشتراک گذاشته نشده</p>
                  <p className="mt-1 text-xs text-muted-foreground">از گزینه «ارسال محصول» اولین پیشنهاد را بفرستید.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {sharedProducts.map((p, idx) => {
                    const img = p?.primary_image || p?.image || PLACEHOLDER_IMG;
                    const hasDiscount = p?.discount_percentage > 0;
                    const compare = p?.original_price || p?.compare_price;
                    return (
                      <Link
                        key={`${p?.id}-${idx}`}
                        to={`/product/${p?.slug}`}
                        onClick={() => setSharedOpen(false)}
                        className="group animate-scale-in overflow-hidden rounded-2xl border border-border/60 bg-popover shadow-sm transition hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-lg"
                        style={{ animationDelay: `${Math.min(idx * 60, 360)}ms` }}
                      >
                        <div className="relative aspect-square overflow-hidden bg-muted/30">
                          <img src={img} alt={p?.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                          {hasDiscount && (
                            <span className="absolute top-2 left-2 rounded-lg bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-black shadow-lg">
                              {p.discount_percentage}٪-
                            </span>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="truncate text-xs font-bold text-foreground">{p?.name}</p>
                          <p className="mt-1 text-sm font-black text-amber-600 dark:text-amber-400 tabular-nums">
                            {formatPrice(p?.price)}
                            {compare && Number(compare) > Number(p?.price) && (
                              <span className="mr-1.5 text-[10px] text-muted-foreground line-through">{formatPrice(compare)}</span>
                            )}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeConfirm} />
          <div className="relative w-full max-w-sm rounded-3xl border border-border/60 bg-card p-6 shadow-2xl">
            <div
              className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
                confirmDialog.danger
                  ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              }`}
            >
              {confirmDialog.danger ? <Ban className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
            </div>
            <h3 className="text-center text-base font-black text-foreground">{confirmDialog.title}</h3>
            <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">{confirmDialog.message}</p>
            <div className="mt-6 flex gap-2.5">
              <button
                type="button"
                onClick={closeConfirm}
                className="flex-1 rounded-xl border border-border/60 bg-muted/50 px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  closeConfirm();
                  confirmDialog.onConfirm && confirmDialog.onConfirm();
                }}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-110 ${
                  confirmDialog.danger
                    ? 'bg-gradient-to-r from-rose-600 to-red-500'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black'
                }`}
              >
                {confirmDialog.confirm || 'تایید'}
              </button>
            </div>
          </div>
        </div>
      )}
  </>
);

export default ChatDialogs;
