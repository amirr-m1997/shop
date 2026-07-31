import { User, UserRound, Baby, Users } from 'lucide-react'
import { cn } from '../../lib/utils'

const GENDERS = [
  { id: 'men', label: 'مردانه', icon: User, desc: 'لباس، کفش و اکسسواری مردانه' },
  { id: 'women', label: 'زنانه', icon: UserRound, desc: 'لباس، کفش و اکسسواری زنانه' },
  { id: 'kids', label: 'بچگانه', icon: Baby, desc: 'سایزبندی بر اساس سن و قد کودک' },
  { id: 'unisex', label: 'یونیسکس', icon: Users, desc: 'محصولات مشترک زنانه و مردانه' },
]

export default function GenderStep({ value, onChange }) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-bold">جنسیت خود را انتخاب کنید</h2>
        <p className="mt-1 text-sm text-muted-foreground/80">
          برای پیشنهاد دقیق‌تر، لطفاً جنسیت را مشخص کنید.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {GENDERS.map(({ id, label, icon: Icon, desc }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              'flex flex-col items-center gap-3 rounded-2xl border-2 p-5 transition-all',
              'backdrop-blur-xl',
              value === id
                ? 'border-primary/40 bg-primary/10 shadow-lg shadow-primary/10'
                : 'border-white/20 bg-white/10 hover:border-white/40 hover:bg-white/20'
            )}
          >
            <div
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-xl transition-colors shadow-sm',
                value === id
                  ? 'bg-primary text-primary-foreground shadow-primary/20'
                  : 'bg-white/10 text-muted-foreground backdrop-blur-sm'
              )}
            >
              <Icon className="h-7 w-7" />
            </div>
            <div className="text-center">
              <div className="text-sm font-bold">{label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground/70 leading-relaxed">{desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
