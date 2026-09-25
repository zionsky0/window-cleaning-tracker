'use client';

import React from 'react';
import { Sparkles, Plus, Cloud, FileSpreadsheet, CheckCircle2, Banknote, CreditCard, Clock } from 'lucide-react';
import { AppStats } from '@/lib/types';
import { CleanerUser } from '@/lib/storage';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  stats: AppStats;
  businessName: string;
  currentUser: CleanerUser | null;
  onOpenAddCustomer: () => void;
  onOpenSync: () => void;
  onOpenExport: () => void;
  showSummaryCards?: boolean;
}

export function Header({
  stats,
  businessName,
  currentUser,
  onOpenAddCustomer,
  onOpenSync,
  onOpenExport,
  showSummaryCards = true,
}: HeaderProps) {
  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      {/* Top Bar */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
              {businessName || 'ClearView'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{todayFormatted}</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Dark Mode Button */}
          <ThemeToggle />

          {/* Export / Spreadsheet Button */}
          <button
            onClick={onOpenExport}
            title="Export to Google Sheets or Excel"
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl border border-slate-200 dark:border-slate-700 transition-all active:scale-95 flex items-center gap-1 text-xs font-semibold cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Cloud Sync Button */}
          <button
            onClick={onOpenSync}
            title={currentUser ? `Synced as ${currentUser.identifier}` : 'Save to Cloud / Log In'}
            className={`p-2 rounded-xl border transition-all active:scale-95 flex items-center gap-1 text-xs font-semibold cursor-pointer ${
              currentUser
                ? 'border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Cloud className={`w-4 h-4 ${currentUser ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">
              {currentUser ? 'Synced' : 'Sync'}
            </span>
          </button>

          {/* Add Customer Button */}
          <button
            onClick={onOpenAddCustomer}
            className="flex items-center gap-1 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-sm shadow-brand-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs transition-colors duration-200">
        <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
          {currentUser ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Backed up to Cloud ({currentUser.identifier})</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span>Saved locally on phone</span>
              <button
                onClick={onOpenSync}
                className="text-brand-600 dark:text-brand-400 font-bold hover:underline ml-1 cursor-pointer"
              >
                Enable Cloud Sync →
              </button>
            </span>
          )}
        </span>
        <span className="text-slate-400 dark:text-slate-500 font-semibold text-[11px]">
          {stats.totalActiveCount} rounds
        </span>
      </div>

      {/* Daily Round Summary Cards (Shown on Today/Route tab) */}
      {showSummaryCards && (
        <>
          <div className="px-4 py-3 bg-white dark:bg-slate-900 grid grid-cols-2 gap-2.5 transition-colors duration-200">
            <div className="bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-xs font-medium text-sky-800 dark:text-sky-300 flex items-center justify-between">
                Today&apos;s Target
                <span className="font-bold text-sky-900 dark:text-sky-200 bg-sky-200/80 dark:bg-sky-900/80 px-1.5 py-0.5 rounded text-[11px]">
                  {stats.dueTodayCount} Due
                </span>
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                  £{stats.todayEstimatedEarnings}
                </span>
                {stats.overdueCount > 0 && (
                  <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 px-1.5 py-0.5 rounded">
                    +{stats.overdueCount} overdue
                  </span>
                )}
              </div>
            </div>

            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                Done Today
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-emerald-800 dark:text-emerald-300">
                  £{stats.completedTodayEarnings}
                </span>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {stats.completedTodayCount} done
                </span>
              </div>
            </div>
          </div>

          {/* Live Payment Totals Breakdown */}
          <div className="px-4 pb-2.5 pt-0.5 bg-white dark:bg-slate-900 grid grid-cols-3 gap-2 transition-colors duration-200">
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/40 rounded-xl p-2 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1 truncate">
                <Banknote className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">Cash</span>
              </span>
              <div className="mt-0.5 flex items-baseline justify-between">
                <span className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                  £{stats.cashAmount}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.cashCount}
                </span>
              </div>
            </div>

            <div className="bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/70 dark:border-sky-900/40 rounded-xl p-2 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1 truncate">
                <CreditCard className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="truncate">Card</span>
              </span>
              <div className="mt-0.5 flex items-baseline justify-between">
                <span className="text-sm font-black text-sky-800 dark:text-sky-300">
                  £{stats.cardAmount}
                </span>
                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">
                  {stats.cardCount}
                </span>
              </div>
            </div>

            <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/40 rounded-xl p-2 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1 truncate">
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">Unpaid</span>
              </span>
              <div className="mt-0.5 flex items-baseline justify-between">
                <span className="text-sm font-black text-amber-800 dark:text-amber-300">
                  £{stats.unpaidAmount}
                </span>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  {stats.unpaidCount}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
