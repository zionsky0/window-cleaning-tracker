'use client';

import React from 'react';
import {
  BarChart3,
  Banknote,
  CreditCard,
  Clock,
  Cloud,
  FileSpreadsheet,
  Moon,
  Sun,
  ShieldCheck,
  Building2,
  Sparkles,
  ExternalLink,
  Users,
  CheckCircle2
} from 'lucide-react';
import { AppStats } from '@/lib/types';
import { CleanerUser } from '@/lib/storage';
import { ThemeToggle } from './ThemeToggle';

interface MoreSettingsViewProps {
  stats: AppStats;
  businessName: string;
  currentUser: CleanerUser | null;
  onOpenSync: () => void;
  onOpenExport: () => void;
  onOpenAddCustomer: () => void;
  onOpenBusinessProfile?: () => void;
  onReopenOnboarding?: () => void;
}

export function MoreSettingsView({
  stats,
  businessName,
  currentUser,
  onOpenSync,
  onOpenExport,
  onOpenAddCustomer,
  onOpenBusinessProfile,
  onReopenOnboarding,
}: MoreSettingsViewProps) {
  const totalCollected = stats.cashAmount + stats.cardAmount;
  const totalCycleEstimate = stats.todayEstimatedEarnings + stats.completedTodayEarnings;

  return (
    <div className="space-y-3.5">
      {/* Reopen Setup Guide Banner */}
      {onReopenOnboarding && (
        <div className="bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-900/80 border border-sky-200/80 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 transition-colors duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                Setup Guide & Checklist
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                4-step onboarding, UK sample customer loader & daily routine tour
              </p>
            </div>
          </div>

          <button
            onClick={onReopenOnboarding}
            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            Open Guide
          </button>
        </div>
      )}

      {/* Financial Health Summary Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs transition-colors duration-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
              Revenue & Payment Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live cash, card, and unpaid totals across your round
            </p>
          </div>
        </div>

        {/* 3 Main Financial Cards */}
        <div className="grid grid-cols-3 gap-2">
          {/* Cash */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/40 rounded-xl p-2.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Cash
            </span>
            <div className="mt-1">
              <span className="text-base sm:text-lg font-black text-emerald-800 dark:text-emerald-300 block">
                £{stats.cashAmount}
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                {stats.cashCount} clean{stats.cashCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Card */}
          <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/40 rounded-xl p-2.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              Card
            </span>
            <div className="mt-1">
              <span className="text-base sm:text-lg font-black text-sky-800 dark:text-sky-300 block">
                £{stats.cardAmount}
              </span>
              <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400">
                {stats.cardCount} clean{stats.cardCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Unpaid */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/40 rounded-xl p-2.5 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Unpaid
            </span>
            <div className="mt-1">
              <span className="text-base sm:text-lg font-black text-amber-800 dark:text-amber-300 block">
                £{stats.unpaidAmount}
              </span>
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                {stats.unpaidCount} customer{stats.unpaidCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Total Collected vs Unpaid Progress Bar */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-1.5 font-bold">
            <span className="text-slate-600 dark:text-slate-300">Total Collected: £{totalCollected}</span>
            <span className="text-amber-600 dark:text-amber-400">Owed: £{stats.unpaidAmount}</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
            {totalCollected + stats.unpaidAmount > 0 ? (
              <>
                <div
                  className="bg-emerald-500 h-full"
                  style={{
                    width: `${(stats.cashAmount / (totalCollected + stats.unpaidAmount)) * 100}%`,
                  }}
                  title="Cash"
                />
                <div
                  className="bg-sky-500 h-full"
                  style={{
                    width: `${(stats.cardAmount / (totalCollected + stats.unpaidAmount)) * 100}%`,
                  }}
                  title="Card"
                />
                <div
                  className="bg-amber-400 h-full"
                  style={{
                    width: `${(stats.unpaidAmount / (totalCollected + stats.unpaidAmount)) * 100}%`,
                  }}
                  title="Unpaid"
                />
              </>
            ) : (
              <div className="bg-slate-300 dark:bg-slate-700 h-full w-full" />
            )}
          </div>
        </div>
      </div>

      {/* Cloud Sync & Backup Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3 transition-colors duration-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                currentUser
                  ? 'bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Cloud Backup & Multi-Phone Sync
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentUser
                  ? `Active account: ${currentUser.identifier}`
                  : 'Currently stored locally on this device'}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenSync}
            className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            {currentUser ? 'Manage Sync' : 'Log In / Backup'}
          </button>
        </div>
      </div>

      {/* Export to Google Sheets & Excel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3 transition-colors duration-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Google Sheets & Excel Export
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Download CSV spreadsheet or sync directly to Google Sheets
              </p>
            </div>
          </div>

          <button
            onClick={onOpenExport}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Export Data
          </button>
        </div>
      </div>

      {/* Preferences & Appearance */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3 transition-colors duration-200">
        <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
          Preferences
        </h4>

        <div className="flex items-center justify-between py-1">
          <div>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">
              Display Theme
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Toggle Light mode or high-contrast Dark mode
            </span>
          </div>
          <ThemeToggle />
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between py-1">
          <div>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">
              Business & Depot Profile
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {businessName || 'ClearView'} • GPS depot base, navigation & round settings
            </span>
          </div>
          {onOpenBusinessProfile && (
            <button
              onClick={onOpenBusinessProfile}
              className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline cursor-pointer"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
