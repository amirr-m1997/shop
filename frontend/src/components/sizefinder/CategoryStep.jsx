import { Shirt, Footprints, Watch, ArrowLeft } from 'lucide-react'
import { cn } from '../../lib/utils'
import { CATEGORY_GROUPS } from '../../config/sizeFinderCategories'

const ICONS = { Shirt, Footprints, Watch }

export default function CategoryStep({ value, onChange }) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-bold">نوع محصول را انتخاب کنید</h2>
        <p className="mt-1 text-sm text-muted-foreground/80">
          اندازه‌گیری‌ها بر اساس نوع محصول نمایش داده می‌شوند.
        </p>
      </div>

      <div className="space-y-4">
        {CATEGORY_GROUPS.map((group) => {
          const GroupIcon = ICONS[group.icon] || Shirt
          return (
            <div key={group.id}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <GroupIcon className="h-4 w-4 text-muted-foreground/60" />
                <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                  {group.label}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {group.categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => onChange(cat.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all backdrop-blur-sm',
                      'hover:border-white/40 hover:bg-white/10',
                      value === cat.id
                        ? 'border-primary/40 bg-primary/10 font-bold text-primary shadow-lg shadow-primary/5'
                        : 'border-white/20 bg-white/10 text-foreground'
                    )}
                  >
                    <span className="flex-1 text-right">{cat.label}</span>
                    {value === cat.id && (
                      <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
