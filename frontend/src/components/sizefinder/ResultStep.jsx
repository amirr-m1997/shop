import { CheckCircle, AlertTriangle, ArrowRight, RefreshCw, Ruler, RotateCw } from 'lucide-react'
import { cn } from '../../lib/utils'

export default function ResultStep({ result, apiError, onRestart, onRetry, onBrowse }) {
  if (apiError) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-200/30 bg-red-500/10 backdrop-blur-xl dark:border-red-800/30">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <h2 className="text-xl font-bold">خطا در پردازش</h2>
        <p className="text-sm text-muted-foreground/80 max-w-sm mx-auto">{apiError}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5"
          >
            <RotateCw className="h-4 w-4" />
            تلاش مجدد
          </button>
          <button
            onClick={onRestart}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-foreground backdrop-blur-xl transition-all hover:bg-white/20"
          >
            شروع مجدد
          </button>
        </div>
      </div>
    )
  }

  if (!result) return null

  const { recommendations, profile, fit_preference } = result

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-xl">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/60" />
          </div>
        </div>
        <h2 className="text-xl font-bold">نتیجه‌ای یافت نشد</h2>
        <p className="text-sm text-muted-foreground/80 max-w-sm mx-auto">
          متأسفانه نتوانستیم سایز مناسبی پیدا کنیم. لطفاً با پشتیبانی تماس بگیرید.
        </p>
        <button
          onClick={onRestart}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5"
        >
          <RefreshCw className="h-4 w-4" />
          شروع مجدد
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold">پیشنهاد سایز شما</h2>
        <p className="mt-1 text-sm text-muted-foreground/80">
          بر اساس اندازه‌های وارد شده
        </p>
      </div>

      {recommendations.map((rec) => (
        <RecommendationCard key={rec.category_id} rec={rec} />
      ))}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onRestart}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-foreground backdrop-blur-xl transition-all hover:bg-white/20"
        >
          <RefreshCw className="h-4 w-4" />
          شروع مجدد
        </button>
        <button
          onClick={onBrowse}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5"
        >
          مشاهده محصولات
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function RecommendationCard({ rec }) {
  const confColor =
    rec.confidence >= 85
      ? 'text-emerald-600 dark:text-emerald-400'
      : rec.confidence >= 70
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-orange-600 dark:text-orange-400'

  const confBorder =
    rec.confidence >= 85
      ? 'border-emerald-200/40 dark:border-emerald-800/30'
      : rec.confidence >= 70
        ? 'border-yellow-200/40 dark:border-yellow-800/30'
        : 'border-orange-200/40 dark:border-orange-800/30'

  const confBar =
    rec.confidence >= 85 ? 'bg-emerald-500' : rec.confidence >= 70 ? 'bg-yellow-500' : 'bg-orange-500'

  return (
    <div className={cn('rounded-2xl border border-white/20 bg-white/10 p-5 space-y-4 backdrop-blur-xl shadow-lg', confBorder)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground/70 mb-1">{rec.category_name}</div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black">{rec.recommended_size}</span>
            <CheckCircle className={cn('h-6 w-6', rec.confidence >= 85 ? 'text-emerald-500' : 'text-muted-foreground/40')} />
          </div>
        </div>
        <div className="text-left">
          <div className={cn('text-2xl font-black', confColor)}>
            {rec.confidence}%
          </div>
          <div className="text-xs text-muted-foreground/60">اطمینان</div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', confBar)}
          style={{ width: `${rec.confidence}%` }}
        />
      </div>

      {/* Fit */}
      {rec.fit && (
        <div className="flex items-center gap-2 text-sm">
          <Ruler className="h-4 w-4 text-muted-foreground/60" />
          <span className="text-muted-foreground/70">فیت پیشنهادی:</span>
          <span className="font-bold">{rec.fit}</span>
        </div>
      )}

      {/* Reason */}
      {rec.reason && (
        <div className="rounded-xl bg-white/5 px-3 py-2 text-xs text-muted-foreground/70 backdrop-blur-sm">
          {rec.reason}
        </div>
      )}

      {/* Alternatives */}
      {rec.alternatives && rec.alternatives.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground/60 mb-1.5">سایزهای جایگزین:</div>
          <div className="flex flex-wrap gap-2">
            {rec.alternatives.map((alt) => (
              <div
                key={alt.size}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs backdrop-blur-sm"
              >
                <span className="font-bold">{alt.size}</span>
                <span className="text-muted-foreground/60">({alt.confidence}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low confidence prompt */}
      {rec.confidence < 70 && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 backdrop-blur-sm">
          برای دقت بیشتر، لطفاً اندازه‌های بیشتری وارد کنید (مثلاً دور سینه یا دور کمر).
        </div>
      )}
    </div>
  )
}
