import { Fragment } from 'react';
import { Check, MapPin, Package, Wallet } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'بررسی سفارش', icon: Package },
  { id: 2, label: 'آدرس ارسال', icon: MapPin },
  { id: 3, label: 'پرداخت', icon: Wallet },
];

/* ─── Progress Stepper ─── */
const Stepper = ({ step }) => (
  <div className="mb-8 animate-fade-in-down">
    <div className="flex items-center justify-between max-w-xl mx-auto">
      {STEPS.map((s, idx) => {
        const Icon = s.icon;
        const done = step > s.id;
        const active = step === s.id;
        return (
          <Fragment key={s.id}>
            <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
              <div
                className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${
                  done
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/25'
                    : active
                      ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/25 scale-105'
                      : 'bg-muted/50 border-border text-muted-foreground'
                }`}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={`text-xs sm:text-sm font-semibold text-center leading-tight ${
                  active || done ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className="flex-1 max-w-[64px] sm:max-w-[96px] h-0.5 mx-1 sm:mx-2 mb-6 rounded-full overflow-hidden bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    step > s.id ? 'w-full bg-emerald-500' : 'w-0 bg-primary'
                  }`}
                />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  </div>
);

export default Stepper;

