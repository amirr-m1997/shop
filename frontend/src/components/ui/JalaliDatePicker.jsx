import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import * as jalaali from 'jalaali-js';

const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر',
  'مرداد', 'شهریور', 'مهر', 'آبان',
  'آذر', 'دی', 'بهمن', 'اسفند',
];

const JALALI_WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function getDaysInJalaliMonth(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jalaali.jalaaliMonthLength(jy, jm);
}

function toJalaliString(gDate) {
  if (!gDate) return '';
  const d = new Date(gDate);
  if (isNaN(d.getTime())) return '';
  const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`;
}

function fromJalaliString(jStr) {
  if (!jStr) return '';
  const parts = jStr.split('/');
  if (parts.length !== 3) return '';
  const jy = parseInt(parts[0], 10);
  const jm = parseInt(parts[1], 10);
  const jd = parseInt(parts[2], 10);
  if (isNaN(jy) || isNaN(jm) || isNaN(jd)) return '';
  try {
    const g = jalaali.toGregorian(jy, jm, jd);
    return `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

const JalaliDatePicker = ({ value, onChange, placeholder = 'انتخاب تاریخ', disabled = false }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const today = useMemo(() => {
    const now = new Date();
    return jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }, []);

  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
      }
    }
    return { jy: today.jy, jm: today.jm, jd: today.jd };
  });

  const [selectedJalali, setSelectedJalali] = useState(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
      }
    }
    return null;
  });

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
        setSelectedJalali(j);
        setViewDate(j);
      }
    } else {
      setSelectedJalali(null);
    }
  }, [value]);

  const daysInMonth = useMemo(() => getDaysInJalaliMonth(viewDate.jy, viewDate.jm), [viewDate.jy, viewDate.jm]);

  const firstDayOffset = useMemo(() => {
    const g = jalaali.toGregorian(viewDate.jy, viewDate.jm, 1);
    const dow = new Date(g.gy, g.gm - 1, g.gd).getDay();
    return (dow + 1) % 7; // Saturday = 0 in Jalali
  }, [viewDate.jy, viewDate.jm]);

  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < firstDayOffset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [daysInMonth, firstDayOffset]);

  const prevMonth = () => {
    if (viewDate.jm === 1) {
      setViewDate({ jy: viewDate.jy - 1, jm: 12, jd: 1 });
    } else {
      setViewDate({ ...viewDate, jm: viewDate.jm - 1, jd: 1 });
    }
  };

  const nextMonth = () => {
    if (viewDate.jm === 12) {
      setViewDate({ jy: viewDate.jy + 1, jm: 1, jd: 1 });
    } else {
      setViewDate({ ...viewDate, jm: viewDate.jm + 1, jd: 1 });
    }
  };

  const selectDay = (day) => {
    const j = { jy: viewDate.jy, jm: viewDate.jm, jd: day };
    setSelectedJalali(j);
    const g = jalaali.toGregorian(j.jy, j.jm, j.jd);
    const gStr = `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`;
    onChange(gStr);
    setOpen(false);
  };

  const displayValue = selectedJalali
    ? `${selectedJalali.jd} ${JALALI_MONTHS[selectedJalali.jm - 1]} ${selectedJalali.jy}`
    : '';

  const years = useMemo(() => {
    const arr = [];
    for (let y = today.jy - 100; y <= today.jy + 5; y++) arr.push(y);
    return arr;
  }, [today.jy]);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-right"
      >
        <span className={displayValue ? '' : 'text-muted-foreground'}>
          {displayValue || placeholder}
        </span>
        <Calendar className="h-4 w-4 text-muted-foreground shrink-0 ms-2" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 z-50 w-72 bg-background border rounded-xl shadow-xl p-3 animate-in fade-in-0 zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <select
                value={viewDate.jm}
                onChange={(e) => setViewDate({ ...viewDate, jm: parseInt(e.target.value), jd: 1 })}
                className="text-sm font-bold bg-transparent border-none focus:outline-none cursor-pointer text-foreground"
              >
                {JALALI_MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={viewDate.jy}
                onChange={(e) => setViewDate({ ...viewDate, jy: parseInt(e.target.value), jd: 1 })}
                className="text-sm bg-transparent border-none focus:outline-none cursor-pointer text-muted-foreground"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {JALALI_WEEKDAYS.map((d, i) => (
              <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;
              const isToday = today.jy === viewDate.jy && today.jm === viewDate.jm && today.jd === day;
              const isSelected = selectedJalali && selectedJalali.jy === viewDate.jy && selectedJalali.jm === viewDate.jm && selectedJalali.jd === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`h-8 w-full text-sm rounded-lg transition-all flex items-center justify-center ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                      : isToday
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted text-foreground'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today button */}
          <div className="mt-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => {
                const g = jalaali.toGregorian(today.jy, today.jm, today.jd);
                const gStr = `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`;
                setSelectedJalali(today);
                setViewDate(today);
                onChange(gStr);
                setOpen(false);
              }}
              className="w-full text-center text-xs text-primary hover:text-primary/80 py-1 rounded hover:bg-primary/5 transition-colors"
            >
              امروز
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { JalaliDatePicker, toJalaliString, fromJalaliString, JALALI_MONTHS };
export default JalaliDatePicker;
