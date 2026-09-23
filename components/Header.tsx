'use client';

import React from 'react';
import { Sparkles, Settings, Plus, RefreshCw, AlertCircle, CheckCircle2, Database, UserCheck } from 'lucide-react';
import { AppStats } from '@/lib/types';

interface HeaderProps {
  stats: AppStats;
  businessName?: string;
  isDemoMode: boolean;
  isLoading: boolean;
  hasCustomSheet: boolean;
  onRefresh: () => void;
  onOpenAddCustomer: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
}

export function Header({
  stats,
  businessName = 'ClearView',
  isDemoMode,
  isLoading,
  hasCustomSheet,
  onRefresh,
  onOpenAddCustomer,
  onOpenSettings,
  onOpenProfile,
}: HeaderProps) {
  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top Bar */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onOpenProfile}
            title="Edit business & cleaner profile"
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20 active:scale-95 transition-transform"
          >
            <Sparkles className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base sm:text-lg text-slate-900 leading-tight truncate max-w-[170px] sm:max-w-[220px]">
                {businessName}
              </h1>
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-brand-100 text-brand-700 shrink-0">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">{todayFormatted}</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh data"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
          </button>
          
          <button
            onClick={onOpenProfile}
            title="Cleaner Profile & Sheet Setup"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors active:scale-95 relative"
          >
            <UserCheck className="w-4 h-4 text-brand-600" />
            {hasCustomSheet && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </button>

          <button
            onClick={onOpenSettings}
            title="Settings & Guide"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors active:scale-95"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenAddCustomer}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm px-3 py-2 rounded-xl shadow-sm shadow-brand-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Google Sheets / Demo Mode Bar */}
      <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500">Database:</span>
          {isDemoMode ? (
            <button
              onClick={onOpenProfile}
              className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 font-medium underline underline-offset-2"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Demo Mode (Connect your Sheet)
            </button>
          ) : (
            <button
              onClick={onOpenProfile}
              className="inline-flex items-center gap-1 text-emerald-700 font-medium hover:underline"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {hasCustomSheet ? 'Your Personal Sheet Connected' : 'Google Sheet Connected'}
            </button>
          )}
        </div>

        <span className="text-slate-400 font-medium text-[11px]">
          {stats.totalActiveCount} active rounds
        </span>
      </div>

      {/* Daily Round Summary Cards */}
      <div className="px-4 py-3 bg-white grid grid-cols-2 gap-2.5">
        <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-xs font-medium text-sky-800 flex items-center justify-between">
            Today's Target
            <span className="font-bold text-sky-900 bg-sky-200/80 px-1.5 py-0.2 rounded text-[11px]">
              {stats.dueTodayCount} Due
            </span>
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-slate-900">
              £{stats.todayEstimatedEarnings}
            </span>
            {stats.overdueCount > 0 && (
              <span className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                +{stats.overdueCount} overdue
              </span>
            )}
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-xs font-medium text-emerald-800 flex items-center justify-between">
            Done Today
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-emerald-800">
              £{stats.completedTodayEarnings}
            </span>
            <span className="text-xs font-semibold text-emerald-700">
              {stats.completedTodayCount} completed
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
