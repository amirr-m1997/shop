import { useState } from 'react'
import { Info, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

export default function MeasurementInput({
  measurement,
  value,
  onChange,
  error,
}) {
  const [showGuide, setShowGuide] = useState(false)
  const { key, label, unit, min, max, tooltip, description, options } = measurement

  const isSelect = unit === 'select'

  return (
    <div className="space-y-1.5">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          {label}
          {unit !== 'select' && (
            <span className="text-xs font-normal text-muted-foreground">({unit})</span>
          )}
        </label>
        {tooltip && (
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="text-muted-foreground hover:text-primary transition-colors"
            aria-label="راهنما"
          >
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tooltip / guide */}
      {showGuide && description && (
        <div className="rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-xs text-muted-foreground/80 leading-relaxed animate-fade-in backdrop-blur-sm">
          {description}
        </div>
      )}

      {/* Input / Select */}
      {isSelect ? (
        <div className="flex gap-2 flex-wrap">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'rounded-xl border px-4 py-2 text-sm transition-all backdrop-blur-sm',
                value === opt.value
                  ? 'border-primary/40 bg-primary/10 text-primary font-bold shadow-lg shadow-primary/5'
                  : 'border-white/20 bg-white/10 text-foreground hover:border-white/40 hover:bg-white/20'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="relative">
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            min={min}
            max={max}
            step="0.5"
            placeholder={`${min} – ${max}`}
            className={cn(
              'w-full rounded-xl border bg-white/10 px-4 py-3 text-sm text-foreground backdrop-blur-sm',
              'placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all',
              error ? 'border-red-400/50' : 'border-white/20'
            )}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {unit}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
