import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const CountdownTimer = ({ expiresAt, onExpire }) => {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    const calculate = () => {
      if (!expiresAt) return null;
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;
      return Math.max(0, diff);
    };

    setRemaining(calculate());
    const timer = setInterval(() => {
      const r = calculate();
      setRemaining(r);
      if (r <= 0) {
        clearInterval(timer);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  if (remaining === null) return null;

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const isUrgent = totalSeconds < 60;

  if (totalSeconds <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/12 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 ring-1 ring-red-500/20">
        <Clock className="h-3 w-3" />
        زمان رزرو به پایان رسیده
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 transition-all duration-300 ${
        isUrgent
          ? 'bg-red-500/12 text-red-600 dark:text-red-400 ring-red-500/20 animate-pulse'
          : 'bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-amber-500/20'
      }`}
    >
      <Clock className="h-3 w-3" />
      <span dir="ltr" className="tabular-nums">
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
      <span className="mr-0.5">مانده</span>
    </span>
  );
};

export default CountdownTimer;
