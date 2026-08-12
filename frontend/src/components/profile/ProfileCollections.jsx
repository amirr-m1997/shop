import {
  ChevronLeft, Globe, Heart, HeartOff, History, MapPin, MapPinOff,
  Pencil, Plus, Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';
import { formatDateShort, formatTime } from '../../lib/formatDate';
import { formatPrice } from '../../lib/formatPrice';
import { PLACEHOLDER_IMG } from '../../lib/placeholders';

const SectionCard = ({ children, className = '', delay = 0 }) => (
  <section
    className={`overflow-hidden rounded-3xl border border-border/50 bg-card/80 shadow-sm shadow-black/[0.03] backdrop-blur-xl ring-1 ring-black/[0.02] transition-all duration-500 hover:shadow-lg hover:shadow-primary/[0.04] dark:ring-white/[0.03] animate-fade-in-up ${className}`}
    style={{ animationDelay: `${delay}s` }}
  >
    {children}
  </section>
);
const SectionHead = ({ icon: Icon, title, action, tone = 'from-primary/15 to-violet-500/10 text-primary' }) => (
  <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-gradient-to-l from-muted/40 via-transparent to-transparent px-5 py-4 sm:px-6">
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tone}`}>
        <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
      </div>
      <h2 className="text-base font-bold tracking-tight sm:text-lg">{title}</h2>
    </div>
    {action}
  </div>
);

const ProfileCollections = ({
  addresses, addrLoading, openAddAddress, openEditAddress, handleDeleteAddress,
  wishlist, toggleWishlist, loginHistoryOpen, setLoginHistoryOpen,
  loadLoginHistory, loginHistoryLoading, loginHistory,
}) => (
  <>
        {/* ── Addresses Section ── */}
        <SectionCard className="mt-6" delay={0.16}>
          <SectionHead
            icon={MapPin}
            title={`آدرس‌های ارسال (${addresses.length.toLocaleString('fa-IR')})`}
            tone="from-rose-500/15 to-pink-500/10 text-rose-600 dark:text-rose-400"
            action={
              <Button
                size="sm"
                onClick={openAddAddress}
                className="h-9 rounded-xl font-bold shadow-md shadow-primary/15"
              >
                <Plus className="ml-1 h-4 w-4" />
                افزودن آدرس
              </Button>
            }
          />
          <div className="p-5 sm:p-6">
            {addrLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" delay={i * 0.1} />
                ))}

              </div>
            ) : addresses.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={MapPinOff}
                  badge="آدرس‌ها"
                  title="هنوز آدرسی ثبت نکرده‌اید"
                  description="یک آدرس ارسال اضافه کنید تا خرید بعدی‌تان سریع‌تر و بدون وقفه تمام شود."
                  primaryLabel="اولین آدرس را اضافه کنید"
                  primaryOnClick={openAddAddress}
                  accent="from-emerald-500/15 via-teal-500/10 to-cyan-500/10"
                  className="py-8"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {addresses.map((addr, idx) => (
                  <div
                    key={addr.id}
                    className={`group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                      addr.is_default
                        ? 'border-primary/30 bg-gradient-to-bl from-primary/[0.08] via-card to-card shadow-md shadow-primary/5'
                        : 'border-border/50 bg-card/60 hover:border-primary/20'
                    }`}
                    style={{ animationDelay: `${idx * 0.04}s` }}
                  >
                    {addr.is_default && (
                      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-violet-500" />
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <span className="truncate font-bold">{addr.full_name}</span>
                          {addr.is_default && (
                            <Badge className="rounded-md border-0 bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary hover:bg-primary/20">
                              پیش‌فرض
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground" dir="ltr">{addr.phone}</p>
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed">{addr.address_line1}</p>
                        {addr.address_line2 && (
                          <p className="truncate text-sm text-muted-foreground">{addr.address_line2}</p>
                        )}
                        <p className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {addr.city}{addr.state ? `، ${addr.state}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => openEditAddress(addr)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteAddress(addr.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Wishlist Section ── */}
        <SectionCard className="mt-6" delay={0.2}>
          <SectionHead
            icon={Heart}
            title={`محصولات مورد علاقه (${wishlist.length.toLocaleString('fa-IR')})`}
            tone="from-red-500/15 to-rose-500/10 text-red-500"
          />
          <div className="p-5 sm:p-6">
            {wishlist.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={HeartOff}
                  badge="علاقه‌مندی‌ها"
                  title="هنوز چیزی ذخیره نکرده‌اید"
                  description="با لمس قلب روی محصولات، آن‌ها را اینجا نگه دارید تا بعداً راحت انتخاب کنید."
                  primaryLabel="کشف محصولات"
                  primaryTo="/products"
                  accent="from-red-500/15 via-rose-500/10 to-pink-500/10"
                  className="py-8"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {wishlist.map((item) => (
                  <Link key={item.id} to={`/product/${item.product?.slug}`} className="group">
                    <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/50 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/[0.06]">
                      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                        <img
                          src={item.product?.primary_image || PLACEHOLDER_IMG}
                          alt={item.product?.name}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                        {item.product?.discount_percentage > 0 && (
                          <Badge className="absolute left-2.5 top-2.5 rounded-lg border-0 bg-destructive px-2 py-0.5 text-xs font-bold shadow-md">
                            −{item.product.discount_percentage}٪
                          </Badge>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleWishlist(item.product?.id);
                          }}
                          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-white dark:bg-black/60 dark:hover:bg-black/80"
                        >
                          <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                        </button>
                      </div>
                      <div className="p-3">
                        <h4 className="truncate text-sm font-bold leading-snug transition-colors group-hover:text-primary">
                          {item.product?.name}
                        </h4>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold tabular-nums">
                            {formatPrice(item.product?.price)}
                          </span>
                          {item.product?.compare_price && (
                            <span className="text-xs font-medium text-red-500/80 line-through tabular-nums">
                              {formatPrice(item.product.compare_price)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Login History Section ── */}
        <SectionCard className="mt-6" delay={0.24}>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 border-b border-border/40 bg-gradient-to-l from-muted/40 via-transparent to-transparent px-5 py-4 text-right transition-colors hover:bg-muted/20 sm:px-6"
            onClick={() => {
              const next = !loginHistoryOpen;
              setLoginHistoryOpen(next);
              if (next && loginHistory.length === 0) loadLoginHistory();
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/15 to-blue-500/10 text-cyan-600 dark:text-cyan-400">
                <History className="h-[18px] w-[18px]" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight sm:text-lg">تاریخچه ورود</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">ورودهای اخیر حساب شما</p>
              </div>
            </div>
            <ChevronLeft
              className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
                loginHistoryOpen ? 'rotate-90' : ''
              }`}
            />
          </button>

          <div
            className={`grid transition-all duration-500 ease-out ${
              loginHistoryOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="p-5 sm:p-6">
                {loginHistoryLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 rounded-2xl" delay={i * 0.08} />
                    ))}
                  </div>
                ) : loginHistory.length === 0 ? (
                  <EmptyState
                    icon={History}
                    badge="امنیت"
                    title="هنوز ورودی ثبت نشده"
                    description="پس از ورودهای بعدی، دستگاه و زمان دسترسی اینجا نمایش داده می‌شود تا حساب‌تان امن بماند."
                    accent="from-slate-500/15 via-blue-500/10 to-cyan-500/10"
                    size="compact"
                    className="py-6"
                  />
                ) : (
                  <div className="space-y-2.5">
                    {loginHistory.map((entry, idx) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/20 p-3.5 transition-all duration-300 hover:border-border hover:bg-muted/40"
                        style={{ animationDelay: `${idx * 0.03}s` }}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-border/50">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{entry.ip_address}</span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="ltr">
                            {entry.user_agent?.substring(0, 70)}{entry.user_agent?.length > 70 ? '...' : ''}
                          </p>
                        </div>
                        <div className="shrink-0 text-left">
                          <p className="text-xs font-medium text-muted-foreground">
                            {formatDateShort(entry.login_time)}
                          </p>
                          <p className="text-xs text-muted-foreground/70">
                            {formatTime(entry.login_time)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

  </>
);

export default ProfileCollections;
