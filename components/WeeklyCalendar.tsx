'use client';

import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { Customer } from '@/lib/types';
import { getCurrentWeekDates, WeekDayInfo } from '@/lib/dateUtils';

interface WeeklyCalendarProps {
  customers: Customer[];
  selectedDate: string | null; // null means 'All Week'
  onSelectDate: (dateString: string | null) => void;
}

export function WeeklyCalendar({
  customers,
  selectedDate,
  onSelectDate,
}: WeeklyCalendarProps) {
  const weekDays = getCurrentWeekDates();

  // Aggregate stats per day of the week
  const dayStats = weekDays.map((day) => {
    const dayCustomers = customers.filter(
      (c) => c.status !== 'paused' && c.nextDueDate === day.dateString
    );
    const count = dayCustomers.length;
    const totalEarnings = dayCustomers.reduce((acc, c) => acc + (c.price || 0), 0);
    return {
      ...day,
      count,
      totalEarnings,
    };
  });

  const totalWeekJobs = dayStats.reduce((sum, d) => sum + d.count, 0);
  const totalWeekEarnings = dayStats.reduce((sum, d) => sum + d.totalEarnings, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-3">
      {/* Header bar of calendar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-100 text-brand-600 flex items-center justify-center">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-900">Weekly Schedule</h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {weekDays[0].dayNumber} {weekDays[0].monthName} – {weekDays[6].dayNumber} {weekDays[6].monthName}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-extrabold text-slate-900">£{totalWeekEarnings}</span>
          <span className="text-[11px] text-slate-500 font-medium block">
            {totalWeekJobs} {totalWeekJobs === 1 ? 'job' : 'jobs'} this week
          </span>
        </div>
      </div>

      {/* 7-Day Calendar Strip */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {dayStats.map((day) => {
          const isSelected = selectedDate === day.dateString;
          const hasJobs = day.count > 0;

          return (
            <button
              key={day.dateString}
              type="button"
              onClick={() => {
                // Clicking the selected date toggles back to All Week
                if (isSelected) {
                  onSelectDate(null);
                } else {
                  onSelectDate(day.dateString);
                }
              }}
              className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all relative ${
                isSelected
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 scale-[1.03]'
                  : day.isToday
                  ? 'bg-sky-50 text-slate-900 border-2 border-brand-500'
                  : hasJobs
                  ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200'
                  : 'bg-transparent hover:bg-slate-50 text-slate-400 border border-transparent'
              }`}
            >
              {/* Day Name */}
              <span
                className={`text-[10px] uppercase font-bold tracking-tight ${
                  isSelected ? 'text-white/80' : day.isToday ? 'text-brand-600' : 'text-slate-400'
                }`}
              >
                {day.dayName}
              </span>

              {/* Day Number */}
              <span
                className={`text-sm sm:text-base font-extrabold my-0.5 ${
                  isSelected ? 'text-white' : day.isToday ? 'text-brand-700' : 'text-slate-800'
                }`}
              >
                {day.dayNumber}
              </span>

              {/* Jobs indicator badge */}
              {hasJobs ? (
                <div className="flex flex-col items-center">
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {day.count}
                  </span>
                  <span
                    className={`text-[9px] font-bold mt-0.5 ${
                      isSelected ? 'text-white/90' : 'text-slate-600'
                    }`}
                  >
                    £{day.totalEarnings}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-300 font-medium mt-1.5">•</span>
              )}

              {/* Today marker dot */}
              {day.isToday && !isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 absolute top-1 right-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* Filter state indicator & reset */}
      {selectedDate && (
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
          <span className="text-slate-600 font-medium">
            Showing only jobs on{' '}
            <strong>
              {new Date(selectedDate).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
              })}
            </strong>
          </span>
          <button
            type="button"
            onClick={() => onSelectDate(null)}
            className="text-brand-600 hover:text-brand-800 font-bold hover:underline"
          >
            Show All Week
          </button>
        </div>
      )}
    </div>
  );
}
