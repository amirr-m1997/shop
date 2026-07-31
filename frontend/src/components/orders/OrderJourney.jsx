import React from 'react';
import { CheckCircle } from 'lucide-react';
import { STATUS_CONFIG, JOURNEY_STEPS } from './constants';

const OrderJourney = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  if (cfg.step < 0) return null;

  return (
    <div className="mt-4 rounded-2xl border border-border/40 bg-muted/20 px-3 py-3.5 sm:px-4">
      <div className="flex items-center justify-between gap-1">
        {JOURNEY_STEPS.map((step, idx) => {
          const done = cfg.step > idx;
          const active = cfg.step === idx;
          const Icon = step.icon;
          return (
            <React.Fragment key={step.key}>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-500 sm:h-9 sm:w-9 ${
                    done
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                      : active
                        ? `bg-gradient-to-br ${cfg.accent} text-white shadow-md scale-105`
                        : 'bg-muted text-muted-foreground ring-1 ring-border/50'
                  }`}
                >
                  {done ? (
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${active && status === 'processing' ? 'animate-spin' : ''}`} />
                  )}
                </div>
                <span
                  className={`text-[10px] font-semibold sm:text-[11px] ${
                    done || active ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < JOURNEY_STEPS.length - 1 && (
                <div className="mb-5 h-0.5 w-full max-w-[28px] flex-1 overflow-hidden rounded-full bg-muted sm:max-w-[48px]">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      cfg.step > idx ? 'w-full bg-emerald-500' : 'w-0'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default OrderJourney;
