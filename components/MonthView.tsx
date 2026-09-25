'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MapPin,
  Phone,
  Send,
  Check,
  RotateCcw,
  Sparkles,
  Banknote,
  CreditCard,
  Clock,
  Navigation,
  Compass,
  Building2,
  Users
} from 'lucide-react';
import { Customer, PaymentStatus } from '@/lib/types';
import {
  getMonthMatrix,
  formatDateDisplay,
  getTodayDateString,
  extractStreetOrArea,
  MonthDayInfo
} from '@/lib/dateUtils';

interface MonthViewProps {
  customers: Customer[];
  onOpenOnMyWay: (customer: Customer) => void;
  onMarkComplete: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onUpdatePaymentStatus: (customer: Customer, status: PaymentStatus) => void;
  onPlanRouteForDay?: (dayCustomers: Customer[]) => void;
  isCompletingId?: string | null;
}

export function MonthView({
  customers,
  onOpenOnMyWay,
  onMarkComplete,
  onEdit,
  onUpdatePaymentStatus,
  onPlanRouteForDay,
  isCompletingId,
}: MonthViewProps) {
  const todayStr = getTodayDateString();
  const [todayYear, todayMonth] = todayStr.split('-').map(Number);

  const [currentYear, setCurrentYear] = useState(todayYear);
  const [currentMonth, setCurrentMonth] = useState(todayMonth); // 1-indexed
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [subView, setSubView] = useState<'calendar' | 'areas'>('calendar');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string | null>(null);

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentYear(todayYear);
    setCurrentMonth(todayMonth);
    setSelectedDate(todayStr);
  };

  // Month grid days
  const matrix = useMemo(() => {
    return getMonthMatrix(currentYear, currentMonth, todayStr);
  }, [currentYear, currentMonth, todayStr]);

  // Map of dateString -> Customer[]
  const dateCustomerMap = useMemo(() => {
    const map = new Map<string, Customer[]>();
    customers.forEach((c) => {
      if (c.status === 'paused') return;
      const d = c.nextDueDate;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(c);
    });
    return map;
  }, [customers]);

  // Month summary stats
  const monthStats = useMemo(() => {
    const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    let totalCleans = 0;
    let totalRevenue = 0;

    customers.forEach((c) => {
      if (c.status === 'paused') return;
      if (c.nextDueDate.startsWith(monthPrefix)) {
        totalCleans++;
        totalRevenue += c.price;
      }
    });

    return { totalCleans, totalRevenue };
  }, [customers, currentYear, currentMonth]);

  // Customers for currently selected date
  const selectedDayCustomers = useMemo(() => {
    const list = dateCustomerMap.get(selectedDate) || [];
    if (!selectedAreaFilter) return list;
    return list.filter((c) => extractStreetOrArea(c.address) === selectedAreaFilter);
  }, [dateCustomerMap, selectedDate, selectedAreaFilter]);

  // Distinct streets / areas on selected date
  const selectedDayAreas = useMemo(() => {
    const list = dateCustomerMap.get(selectedDate) || [];
    const counts = new Map<string, number>();
    list.forEach((c) => {
      const area = extractStreetOrArea(c.address);
      counts.set(area, (counts.get(area) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([area, count]) => ({ area, count }));
  }, [dateCustomerMap, selectedDate]);

  // Overall Area / Street breakdown for all active customers
  const areaBreakdown = useMemo(() => {
    const areaMap = new Map<string, Customer[]>();
    customers.forEach((c) => {
      if (c.status === 'paused') return;
      const area = extractStreetOrArea(c.address);
      if (!areaMap.has(area)) areaMap.set(area, []);
      areaMap.get(area)!.push(c);
    });

    return Array.from(areaMap.entries())
      .map(([area, custs]) => {
        const totalValue = custs.reduce((sum, c) => sum + c.price, 0);
        // Dates scheduled in the future or this month
        const nextDates = Array.from(new Set(custs.map((c) => c.nextDueDate))).sort();
        return {
          area,
          customers: custs,
          totalValue,
          nextDates,
        };
      })
      .sort((a, b) => b.customers.length - a.customers.length);
  }, [customers]);

  const monthDateObj = new Date(currentYear, currentMonth - 1, 1);
  const monthNameFormatted = monthDateObj.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  const selectedDateFormatted = useMemo(() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, [selectedDate]);

  const selectedDayTotalValue = selectedDayCustomers.reduce((sum, c) => sum + c.price, 0);

  return (
    <div className="space-y-3">
      {/* Month Navigator & Summary Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs transition-colors duration-200">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevMonth}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white min-w-[140px] text-center">
              {monthNameFormatted}
            </h3>
            <button
              onClick={handleNextMonth}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleGoToday}
              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>

        {/* Month Stats Strip */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-slate-700 dark:text-slate-200">
              {monthStats.totalCleans} cleans in {monthDateObj.toLocaleDateString('en-GB', { month: 'short' })}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
              £{monthStats.totalRevenue} target
            </span>
          </div>

          {/* Subview switcher: Calendar vs Street/Area breakdown */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60">
            <button
              onClick={() => setSubView('calendar')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                subView === 'calendar'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setSubView('areas')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                subView === 'areas'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Where & When
            </button>
          </div>
        </div>
      </div>

      {subView === 'calendar' ? (
        <>
          {/* Calendar Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3.5 shadow-xs transition-colors duration-200">
            {/* Days of week */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div
                  key={day}
                  className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Matrix Cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {matrix.map((day) => {
                const dayCleans = dateCustomerMap.get(day.dateString) || [];
                const cleanCount = dayCleans.length;
                const dayValue = dayCleans.reduce((s, c) => s + c.price, 0);
                const isSelected = selectedDate === day.dateString;
                const hasCleans = cleanCount > 0;

                return (
                  <button
                    key={day.dateString}
                    type="button"
                    onClick={() => {
                      setSelectedDate(day.dateString);
                      setSelectedAreaFilter(null);
                    }}
                    className={`relative min-h-[58px] sm:min-h-[64px] p-1 rounded-xl flex flex-col items-center justify-between transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30 ring-2 ring-brand-400'
                        : day.isToday
                        ? 'bg-sky-100 dark:bg-sky-950/70 border border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-200'
                        : day.isCurrentMonth
                        ? 'bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800/80'
                        : 'bg-transparent text-slate-300 dark:text-slate-700 opacity-40'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span
                        className={`text-xs font-black ${
                          isSelected
                            ? 'text-white'
                            : day.isToday
                            ? 'text-brand-600 dark:text-brand-300'
                            : ''
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {/* Overdue alert marker if past & has cleans */}
                      {day.isPast && hasCleans && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Overdue cleans" />
                      )}
                    </div>

                    {/* Cleans Badge on Day Cell */}
                    {hasCleans ? (
                      <div
                        className={`w-full mt-0.5 py-0.5 px-1 rounded-md text-center transition-all ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-brand-100 dark:bg-brand-950/80 text-brand-800 dark:text-brand-300 border border-brand-200 dark:border-brand-800/60'
                        }`}
                      >
                        <span className="block text-[10px] font-black leading-none">
                          {cleanCount} clean{cleanCount > 1 ? 's' : ''}
                        </span>
                        <span className="block text-[9px] font-bold opacity-85 leading-none mt-0.5">
                          £{dayValue}
                        </span>
                      </div>
                    ) : (
                      <div className="h-3" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Details Panel ("Where & When for this day") */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3 transition-colors duration-200">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Day Schedule
                </span>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                  {selectedDateFormatted}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {selectedDayCustomers.length} clean{selectedDayCustomers.length !== 1 ? 's' : ''} • £{selectedDayTotalValue}
                </span>

                {selectedDayCustomers.length > 0 && onPlanRouteForDay && (
                  <button
                    onClick={() => onPlanRouteForDay(selectedDayCustomers)}
                    className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Plan Route</span>
                  </button>
                )}
              </div>
            </div>

            {/* Street / Neighborhood Clusters on this day */}
            {selectedDayAreas.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 shrink-0 uppercase">Area:</span>
                <button
                  type="button"
                  onClick={() => setSelectedAreaFilter(null)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 cursor-pointer ${
                    selectedAreaFilter === null
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  All Areas ({dateCustomerMap.get(selectedDate)?.length || 0})
                </button>
                {selectedDayAreas.map(({ area, count }) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setSelectedAreaFilter(area)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 cursor-pointer flex items-center gap-1 ${
                      selectedAreaFilter === area
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <MapPin className="w-3 h-3" />
                    <span>{area}</span>
                    <span className="text-[10px] opacity-80">({count})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Customer List for this day */}
            {selectedDayCustomers.length === 0 ? (
              <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                No cleans scheduled for this date.
              </div>
            ) : (
              <div className="space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/80">
                {selectedDayCustomers.map((customer, index) => {
                  const isDoneToday = customer.lastCleanedDate === todayStr;
                  const pStatus: PaymentStatus = customer.paymentStatus || 'unpaid';

                  return (
                    <div
                      key={customer.id}
                      className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        {/* Done toggle checkbox */}
                        <button
                          type="button"
                          onClick={() => onMarkComplete(customer)}
                          disabled={isCompletingId === customer.id}
                          className={`w-7 h-7 rounded-xl shrink-0 flex items-center justify-center transition-all mt-0.5 cursor-pointer ${
                            isDoneToday
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                              : 'border-2 border-slate-300 dark:border-slate-600 text-slate-300'
                          }`}
                        >
                          {isCompletingId === customer.id ? (
                            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                          ) : isDoneToday ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <span className="text-[11px] font-bold text-slate-400">{index + 1}</span>
                          )}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5
                              className={`font-bold text-sm truncate ${
                                isDoneToday ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {customer.name}
                            </h5>

                            {pStatus === 'cash' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                <Banknote className="w-2.5 h-2.5" /> Cash
                              </span>
                            ) : pStatus === 'card' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                                <CreditCard className="w-2.5 h-2.5" /> Card
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                <Clock className="w-2.5 h-2.5" /> Unpaid
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{customer.address}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pl-9 sm:pl-0">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          £{customer.price}
                        </span>

                        <div className="flex items-center gap-1">
                          {/* On my way */}
                          <button
                            onClick={() => onOpenOnMyWay(customer)}
                            title="Send On My Way"
                            className="p-1.5 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/60 rounded-lg transition-colors cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {/* Call */}
                          {customer.phone && (
                            <a
                              href={`tel:${customer.phone}`}
                              title={`Call ${customer.name}`}
                              className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Directions */}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              customer.address
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Directions"
                            className="p-1.5 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/60 rounded-lg transition-colors"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* "Where & When" - Area & Street Breakdown View */
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-600" />
              <span>Customer Locations & Scheduled Rounds</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              See which neighborhoods you clean, how many houses are on each street, and when they are due.
            </p>
          </div>

          <div className="space-y-3">
            {areaBreakdown.map((item) => (
              <div
                key={item.area}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3 transition-colors duration-200"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                        {item.area}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.customers.length} customer{item.customers.length !== 1 ? 's' : ''} • £{item.totalValue} round value
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                    Every {item.customers[0]?.frequencyWeeks || 4}w
                  </span>
                </div>

                {/* Next scheduled dates for this street */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[11px] font-bold text-slate-400">Scheduled:</span>
                  {item.nextDates.slice(0, 3).map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setSelectedDate(d);
                        setSubView('calendar');
                      }}
                      className="px-2 py-0.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/60 text-[11px] font-bold hover:bg-brand-100 transition-colors cursor-pointer"
                    >
                      {formatDateDisplay(d)}
                    </button>
                  ))}
                </div>

                {/* Customer list on this street */}
                <div className="space-y-1.5 pt-1">
                  {item.customers.map((c) => (
                    <div
                      key={c.id}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {c.name}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                          {c.address}
                        </span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className="font-extrabold text-slate-900 dark:text-white block">
                          £{c.price}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Due {formatDateDisplay(c.nextDueDate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
