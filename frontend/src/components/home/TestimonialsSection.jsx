import { Quote, Star, Send, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import AmbientMesh from './AmbientMesh';

const TestimonialsSection = ({
  testimonials,
  currentTestimonial,
  setCurrentTestimonial,
  showTestimonialForm,
  setShowTestimonialForm,
  testimonialForm,
  setTestimonialForm,
  testimonialSubmitting,
  testimonialSubmitted,
  handleTestimonialSubmit,
}) => {
  if (!testimonials.length) return null;
  const t = testimonials[currentTestimonial];

  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <AmbientMesh />
      <div className="container relative mx-auto px-4">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5">
            <Quote className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">نظرات مشتریان</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl md:text-4xl">
            مشتریان ما چه می‌گویند؟
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            صدای واقعی خریدارانی که به کیفیت و استایل ما اعتماد کرده‌اند
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-border/50 bg-card/80 p-7 shadow-2xl shadow-primary/[0.05] backdrop-blur-xl sm:p-10">
            <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
            <Quote className="absolute left-6 top-6 h-12 w-12 text-primary/[0.08]" aria-hidden />

            <div className="relative">
              <div className="mb-5 flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 transition-colors ${
                      i < t.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/25'
                    }`}
                  />
                ))}
              </div>

              <p className="mb-8 min-h-[5rem] text-lg font-medium leading-relaxed tracking-tight sm:text-xl md:text-2xl">
                «{t.text}»
              </p>

              <div className="flex items-center gap-3.5">
                <div className="flex h-13 w-13 h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-lg font-black text-primary-foreground shadow-lg shadow-primary/25">
                  {t.name[0]}
                </div>
                <div>
                  <p className="font-bold tracking-tight">{t.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t.role || 'خریدار'}
                  </p>
                </div>
              </div>

              {testimonials.length > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentTestimonial(i)}
                      className={`h-2 rounded-full transition-all duration-500 ${
                        i === currentTestimonial
                          ? 'w-9 bg-primary'
                          : 'w-2 bg-muted-foreground/25 hover:bg-muted-foreground/45'
                      }`}
                      aria-label={`نظر ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-7 text-center">
            {!showTestimonialForm ? (
              <Button
                variant="outline"
                onClick={() => setShowTestimonialForm(true)}
                className="h-11 rounded-2xl border-border/60 px-6 font-bold shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
              >
                <Quote className="ml-2 h-4 w-4" />
                نظر شما چیست؟
              </Button>
            ) : (
              <div className="rounded-[1.5rem] border border-border/50 bg-card/80 p-6 text-right shadow-xl backdrop-blur-xl sm:p-7 animate-fade-in-up">
                {testimonialSubmitted ? (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                      <CheckCircle className="h-8 w-8 text-emerald-500" />
                    </div>
                    <p className="text-lg font-black">نظر شما با موفقیت ارسال شد!</p>
                    <p className="text-sm text-muted-foreground">
                      پس از تایید ادمین، نظر شما نمایش داده خواهد شد.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleTestimonialSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold">نام شما *</label>
                        <Input
                          required
                          placeholder="نام خود را وارد کنید"
                          value={testimonialForm.name}
                          onChange={(e) =>
                            setTestimonialForm((prev) => ({ ...prev, name: e.target.value }))
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold">سمت (اختیاری)</label>
                        <Input
                          placeholder="مثلاً خریدار دائمی"
                          value={testimonialForm.role}
                          onChange={(e) =>
                            setTestimonialForm((prev) => ({ ...prev, role: e.target.value }))
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold">نظر شما *</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="نظر خود را بنویسید..."
                        className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={testimonialForm.text}
                        onChange={(e) =>
                          setTestimonialForm((prev) => ({ ...prev, text: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold">امتیاز شما</label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() =>
                              setTestimonialForm((prev) => ({ ...prev, rating: star }))
                            }
                            className="p-0.5 transition-transform hover:scale-110 active:scale-95"
                            aria-label={`${star} ستاره`}
                          >
                            <Star
                              className={`h-7 w-7 ${
                                star <= testimonialForm.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-muted-foreground/30'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowTestimonialForm(false)}
                        className="rounded-xl"
                      >
                        انصراف
                      </Button>
                      <Button
                        type="submit"
                        disabled={testimonialSubmitting}
                        className="h-11 rounded-xl px-6 font-bold shadow-md shadow-primary/15"
                      >
                        <Send className="ml-2 h-4 w-4" />
                        {testimonialSubmitting ? 'در حال ارسال...' : 'ارسال نظر'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
