import React, { useMemo } from 'react';
import { Star, Send, CheckCircle, MessageSquare } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { formatDate } from '../../lib/formatDate';
import EmptyState from '../ui/EmptyState';

const ReviewsSection = ({
  reviews,
  reviewRating,
  setReviewRating,
  reviewTitle,
  setReviewTitle,
  reviewComment,
  setReviewComment,
  reviewSubmitting,
  reviewSubmitted,
  handleSubmitReview,
  isAuthenticated,
  productRating = 0,
}) => {
  const distribution = useMemo(() => {
    const counts = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((review) => Math.round(review.rating || 0) === star).length,
    }));

    return counts;
  }, [reviews]);

  const averageRating = useMemo(() => {
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
      return sum / reviews.length;
    }
    return productRating || 0;
  }, [reviews, productRating]);

  return (
    <section className="mt-16 scroll-mt-24 sm:mt-24">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground/70">
            تجربه خرید
          </p>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            نظرات مشتریان
          </h2>
        </div>
        <div className="hidden h-px flex-1 bg-gradient-to-l from-border via-border/50 to-transparent sm:block" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-[2rem] border border-border/45 bg-card/60 p-6 shadow-xl shadow-black/[0.03] backdrop-blur-xl lg:col-span-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-foreground text-background shadow-lg shadow-foreground/10">
              <span className="text-2xl font-black leading-none tabular-nums">
                {Number(averageRating || 0).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < Math.round(averageRating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/25'}`}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-sm font-bold text-foreground">
                {reviews.length.toLocaleString('fa-IR')} نظر ثبت شده
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-2.5">
            {distribution.map((item) => {
              const percent = reviews.length > 0 ? (item.count / reviews.length) * 100 : 0;
              return (
                <div key={item.star} className="flex items-center gap-3">
                  <span className="w-5 text-left text-xs font-bold tabular-nums text-muted-foreground">
                    {item.star.toLocaleString('fa-IR')}
                  </span>
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-amber-400 to-amber-300 transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-8 text-left text-[11px] font-semibold tabular-nums text-muted-foreground/80">
                    {item.count.toLocaleString('fa-IR')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[2rem] border border-border/45 bg-card/45 p-5 shadow-sm backdrop-blur-xl lg:col-span-4 lg:p-6">
          <h3 className="mb-4 text-base font-extrabold">نظر خود را بنویسید</h3>
          {reviewSubmitted ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <p className="text-lg font-extrabold">نظر شما ثبت شد</p>
              <p className="max-w-xs text-sm leading-7 text-muted-foreground">
                از اینکه تجربه خود را با ما و دیگر کاربران به اشتراک گذاشتید، سپاسگزاریم.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold">امتیاز شما <span className="text-destructive">*</span></label>
                <div className="flex gap-1.5 rounded-2xl border border-border/60 bg-background/55 p-2.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="rounded-xl p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`امتیاز ${star.toLocaleString('fa-IR')}`}
                    >
                      <Star
                        className={`h-7 w-7 transition-colors ${
                          star <= reviewRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground/25'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-muted-foreground">
                  عنوان نظر اختیاری است.
                </label>
                <Input
                  placeholder="عنوان نظر"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="h-11 rounded-xl border-border/70 bg-background/70"
                />
              </div>

              <textarea
                placeholder="تجربه خرید، کیفیت، سایز و حس محصول را بنویسید..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-xl border border-border/70 bg-background/70 px-3.5 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />

              <Button
                type="submit"
                disabled={reviewSubmitting}
                className="h-12 w-full rounded-xl bg-foreground text-base font-black text-background hover:bg-foreground/90"
              >
                <Send className="ml-2 h-4 w-4" />
                {reviewSubmitting ? 'در حال ثبت...' : 'ثبت نظر'}
              </Button>

              {!isAuthenticated && (
                <p className="rounded-xl bg-muted/70 px-3 py-2 text-center text-xs leading-6 text-muted-foreground">
                  برای ثبت نظر وارد حساب کاربری خود می‌شوید.
                </p>
              )}
            </form>
          )}
        </div>

        <div className="space-y-3 lg:col-span-4">
          {reviews.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-[2rem] border border-dashed border-border/60 bg-gradient-to-br from-card/70 via-muted/10 to-card/40 p-6 text-center backdrop-blur-sm">
              <EmptyState
                icon={MessageSquare}
                badge="نظرات"
                title="هنوز نظری ثبت نشده"
                description="اولین نفری باشید که تجربه خریدتان را به اشتراک می‌گذارید."
                accent="from-amber-500/15 via-orange-500/10 to-rose-500/10"
                size="compact"
              />
            </div>
          ) : (
            reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-[1.5rem] border border-border/45 bg-card/50 p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-lg"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-sm font-black text-background">
                      {(review.owner_name || 'م').charAt(0)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-foreground">
                          {review.owner_name || 'مشتری'}
                        </span>
                        {review.is_verified_purchase && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="h-3 w-3" />
                            خریدار تایید شده
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/25'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatDate(review.created_at)}
                  </span>
                </div>
                {review.title && <h4 className="mb-1 text-sm font-extrabold">{review.title}</h4>}
                {review.comment ? (
                  <p className="text-sm leading-7 text-muted-foreground">{review.comment}</p>
                ) : (
                  <p className="text-sm leading-7 text-muted-foreground/70">
                    این کاربر فقط امتیاز ثبت کرده است.
                  </p>
                )}
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
