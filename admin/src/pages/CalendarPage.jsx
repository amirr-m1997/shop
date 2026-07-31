import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ShoppingCart, CheckSquare } from 'lucide-react';
import { toJalaali, toGregorian, isLeapJalaaliYear } from 'jalaali-js';
import { calendarAPI } from '../services/api';
import { formatPrice } from '../lib/utils';
import toast from 'react-hot-toast';

const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

function getDaysInJalaliMonth(jy, jm) {
  const daysInMonth = jm <= 6 ? 31 : jm <= 11 ? 30 : (isLeapJalaliYear(jy) ? 30 : 29);
  const firstDay = toGregorian(jy, jm, 1);
  const firstDate = new Date(firstDay[0], firstDay[1] - 1, firstDay[2]);
  const firstWeekday = firstDate.getDay();
  const offset = (firstWeekday + 1) % 7;
  return { daysInMonth, offset };
}

function gregorianToJalaliStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const j = toJalaali(y, m, d);
  return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`;
}

export default function CalendarPage() {
  const now = new Date();
  const currentJ = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const [jy, setJy] = useState(currentJ.jy);
  const [jm, setJm] = useState(currentJ.jm);
  const [calendarData, setCalendarData] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const greg = toGregorian(jy, jm, 1);
      const year = greg[0];
      const month = greg[1];
      const res = await calendarAPI.getData({ year, month });
      setCalendarData(res.data.calendar || {});
      setSummary(res.data.summary || null);
    } catch {
      toast.error('خطا در بارگذاری تقویم');
    } finally {
      setLoading(false);
    }
  }, [jy, jm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const prevMonth = () => {
    if (jm === 1) { setJy(jy - 1); setJm(12); }
    else setJm(jm - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (jm === 12) { setJy(jy + 1); setJm(1); }
    else setJm(jm + 1);
    setSelectedDay(null);
  };

  const { daysInMonth, offset } = getDaysInJalaliMonth(jy, jm);

  const buildGregDate = (day) => {
    const g = toGregorian(jy, jm, day);
    return `${g[0]}-${String(g[1]).padStart(2, '0')}-${String(g[2]).padStart(2, '0')}`;
  };

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayStr = buildGregDate(currentJ.jy === jy && currentJ.jm === jm ? currentJ.jd : -1);

  const selectedData = selectedDay ? calendarData[buildGregDate(selectedDay)] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">تقویم کاری</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">برنامه‌ریزی و مشاهده سفارشات و وظایف</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <ChevronRight className="h-5 w-5 text-slate-500" />
            </button>
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {JALALI_MONTHS[jm - 1]} {jy}
              </h2>
            </div>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <ChevronLeft className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (day === null) return <div key={`empty-${i}`} />;
                const gregStr = buildGregDate(day);
                const dayData = calendarData[gregStr];
                const isToday = gregStr === todayStr;
                const isSelected = day === selectedDay;
                const hasOrders = dayData && dayData.orders > 0;
                const hasTodos = dayData && dayData.todos && dayData.todos.length > 0;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                    className={`relative p-2 rounded-lg text-sm transition-all min-h-[60px] text-left ${
                      isSelected
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                        : isToday
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold ring-2 ring-blue-500/30'
                        : hasOrders || hasTodos
                        ? 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/30 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="block">{day}</span>
                    {hasOrders && (
                      <span className={`absolute bottom-1 right-1 text-[9px] px-1 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'}`}>
                        {dayData.orders} سفارش
                      </span>
                    )}
                    {hasTodos && (
                      <span className={`absolute bottom-1 left-1 text-[9px] px-1 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'}`}>
                        {dayData.todos.length} وظیفه
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          {summary && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">خلاصه ماه</h3>
              <div className="space-y-3">
                {[
                  { label: 'کل سفارشات', value: summary.total_orders, color: 'text-blue-500' },
                  { label: 'درآمد', value: formatPrice(summary.total_revenue) + ' ت', color: 'text-emerald-500' },
                  { label: 'وظایف کل', value: summary.total_todos, color: 'text-purple-500' },
                  { label: 'وظایف انجام نشده', value: summary.pending_todos, color: 'text-amber-500' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">{item.label}</span>
                    <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Day Detail */}
          {selectedDay && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">
                {selectedDay} {JALALI_MONTHS[jm - 1]} {jy}
              </h3>
              {selectedData ? (
                <div className="space-y-4">
                  {selectedData.orders > 0 && (
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                        <ShoppingCart className="h-4 w-4" />
                        <span className="text-sm font-medium">{selectedData.orders} سفارش</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        درآمد: {formatPrice(selectedData.revenue)} تومان
                      </div>
                    </div>
                  )}
                  {selectedData.todos && selectedData.todos.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <CheckSquare className="h-4 w-4" />
                        <span className="text-sm font-medium">وظایف</span>
                      </div>
                      {selectedData.todos.map((todo) => (
                        <div key={todo.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${
                              todo.priority === 'high' ? 'bg-red-500' :
                              todo.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-400'
                            }`} />
                            <span className={todo.is_done ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}>
                              {todo.title}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!selectedData.orders && (!selectedData.todos || selectedData.todos.length === 0) && (
                    <div className="text-center py-4 text-sm text-slate-400">رویدادی ثبت نشده</div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-slate-400">رویدادی ثبت نشده</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
