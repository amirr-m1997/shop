import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'

const STEP_LABELS = ['جنسیت', 'دسته‌بندی', 'اندازه‌ها', 'نتیجه']

export default function ProgressBar({ currentStep, totalSteps }) {
  const pct = Math.round((currentStep / (totalSteps - 1)) * 100)

  return (
    <div className="mb-8">
      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-center justify-between mb-3">
        {STEP_LABELS.map((label, i) => {
          const done = i < currentStep
          const active = i === currentStep
          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all',
                  done && 'bg-primary text-primary-foreground',
                  active && 'bg-primary/15 text-primary ring-2 ring-primary',
                  !done && !active && 'bg-muted text-muted-foreground'
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs font-medium transition-colors',
                  (done || active) ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Mobile: simple bar */}
      <div className="sm:hidden flex items-center gap-3 mb-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {currentStep + 1}/{totalSteps}
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Bar (all sizes) */}
      <div className="hidden sm:block h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
