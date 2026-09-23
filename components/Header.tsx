'use client';

import React from 'react';
import { signOut } from 'next-auth/react';
import { Sparkles, Plus, RefreshCw, CheckCircle2, LogOut } from 'lucide-react';
import { AppStats } from '@/lib/types';

interface HeaderProps {
  stats: AppStats;
  userName?: string | null;
  userImage?: string | null;
  isDemoMode: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenAddCustomer: () => void;
}

export function Header({
  stats,
  userName,
  userImage,
  isDemoMode,
  isLoading,
  onRefresh,
  onOpenAddCustomer,
}: HeaderProps) {
  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  const firstName = userName?.split(' ')[0] || 'Cleaner';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top Bar */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg text-slate-900 leading-tight">
              ClearView
            </h1>
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
          
          {/* User avatar / sign out */}
          {!isDemoMode && (
            <button
              onClick={() => signOut()}
              title={`Signed in as ${userName || 'user'} — tap to sign out`}
              className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors active:scale-95"
            >
              {userImage ? (
                <img
                  src={userImage}
                  alt=""
                  className="w-7 h-7 rounded-full ring-2 ring-brand-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                  {firstName.charAt(0)}
                </div>
              )}
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}

          <button
            onClick={onOpenAddCustomer}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm px-3 py-2 rounded-xl shadow-sm shadow-brand-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Signed-in user greeting + sync status */}
      <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-600 font-medium">
          {isDemoMode ? (
            <span className="inline-flex items-center gap-1 text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Demo Mode — sign in to save your data
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Hi {firstName}! Syncing to your Google Sheet
            </span>
          )}
        </span>
        <span className="text-slate-400 font-medium text-[11px]">
          {stats.totalActiveCount} rounds
        </span>
      </div>

      {/* Daily Round Summary Cards */}
      <div className="px-4 py-3 bg-white grid grid-cols-2 gap-2.5">
        <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-xs font-medium text-sky-800 flex items-center justify-between">
            Today&apos;s Target
            <span className="font-bold text-sky-900 bg-sky-200/80 px-1.5 py-0.5 rounded text-[11px]">
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
              {stats.completedTodayCount} done
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
