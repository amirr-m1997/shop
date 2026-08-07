import React from 'react';
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
}) => {
  return (
    <section className="mt-16 sm:mt-20">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            نظرات مشتریان
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {reviews.length.toLocaleString('fa-IR')} نظر
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="rounded-[1.5rem] border border-border/40 bg-card/70 p-6 shadow-lg backdrop-blur-xl dark:border-white/[0.08] dark:bg-card/50 lg:col-span-2">
          <h3 className="mb-4 font-bold">نظر خود را بنویسید</h3>
          {reviewSubmitted ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                <CheckCircle className="h-7 w-7 text-emerald-500" />
              </div>
              <p className="font-bold">نظر شما ثبت شد</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">امتیاز <span className="text-destructive">*</span></label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-7 w-7 ${
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
                  می‌توانید فقط با انتخاب ستاره‌ها نظر ثبت کنید؛ عنوان و توضیح اختیاری است.
                </label>
                <Input
                  placeholder="عنوان نظر (اختیاری)"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <textarea
                placeholder="متن نظر خود را بنویسید... (اختیاری)"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <Button
                type="submit"
                disabled={reviewSubmitting}
                className="h-11 w-full rounded-xl font-bold"
              >
                <Send className="ml-2 h-4 w-4" />
                {reviewSubmitting ? 'در حال ثبت...' : 'ثبت نظر'}
              </Button>
            </form>
          )}
        </div>

        <div className="space-y-3 lg:col-span-3">
          {reviews.length === 0 ? (
            <div className="flex h-full min-h-[220px] items-center justify-center rounded-[1.5rem] border border-dashed border-border/50 bg-gradient-to-br from-card/80 via-muted/10 to-card/60">
              <EmptyState
                icon={MessageSquare}
                badge="نظرات"
                title="هنوز نظری ثبت نشده"
                description="اولین نفری باشید که تجربه خریدتان را به اشتراک می‌گذارید — نظر شما به دیگران کمک می‌کند."
                accent="from-amber-500/15 via-orange-500/10 to-rose-500/10"
                size="compact"
                className="py-6"
              />
            </div>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-[1.25rem] border border-border/40 bg-card/60 p-5 shadow-sm backdrop-blur-sm dark:border-white/[0.06]"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-bold">
                        {review.owner_name || 'مشتری'}
                      </span>
                      {review.is_verified_purchase && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="h-3 w-3" />
                          خریدار تایید شده
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < review.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted-foreground/25'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(review.created_at)}
                  </span>
                </div>
                {review.title && (
                  <h4 className="mb-1 text-sm font-bold">{review.title}</h4>
                )}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {review.comment}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
