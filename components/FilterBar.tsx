'use client';

import React from 'react';
import { Search, X, Banknote, CreditCard, Clock, Landmark } from 'lucide-react';

export type TabType = 'today' | 'week' | 'all' | 'completed';
export type PaymentFilter = 'all' | 'unpaid' | 'cash' | 'card' | 'bacs';

interface FilterBarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  todayCount: number;
  weekCount: number;
  totalCount: number;
  completedCount: number;
  paymentFilter: PaymentFilter;
  onPaymentFilterChange: (filter: PaymentFilter) => void;
  unpaidCount: number;
  cashCount: number;
  cardCount: number;
  bacsCount: number;
}

export function FilterBar({
  currentTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  todayCount,
  weekCount,
  totalCount,
  completedCount,
  paymentFilter,
  onPaymentFilterChange,
  unpaidCount,
  cashCount,
  bacsCount,
  cardCount,
}: FilterBarProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-2 pb-3 space-y-2.5 transition-colors duration-200">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name, street, notes..."
          className="w-full bg-slate-100/80 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl gap-1 transition-colors duration-200">
        <button
          onClick={() => onTabChange('today')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            currentTab === 'today'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>Up Next</span>
          {todayCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                currentTab === 'today'
                  ? 'bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {todayCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange('week')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            currentTab === 'week'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>This Week</span>
          {weekCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                currentTab === 'week'
                  ? 'bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {weekCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange('all')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            currentTab === 'all'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>All ({totalCount})</span>
        </button>

        {completedCount > 0 && (
          <button
            onClick={() => onTabChange('completed')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              currentTab === 'completed'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Done ({completedCount})</span>
          </button>
        )}
      </div>

      {/* Payment Filter Pills Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
        <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-0.5">
          Payment:
        </span>

        <button
          type="button"
          onClick={() => onPaymentFilterChange('all')}
          className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 transition-all cursor-pointer ${
            paymentFilter === 'all'
              ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          All
        </button>

        <button
          type="button"
          onClick={() => onPaymentFilterChange('unpaid')}
          className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
            paymentFilter === 'unpaid'
              ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-400/40'
              : 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
          }`}
        >
          <Clock className="w-3 h-3" />
          <span>Unpaid</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              paymentFilter === 'unpaid'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200'
            }`}
          >
            {unpaidCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onPaymentFilterChange('cash')}
          className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
            paymentFilter === 'cash'
              ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/40'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
          }`}
        >
          <Banknote className="w-3 h-3" />
          <span>Cash</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              paymentFilter === 'cash'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200'
            }`}
          >
            {cashCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onPaymentFilterChange('bacs')}
          className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
            paymentFilter === 'bacs'
              ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400/40'
              : 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
          }`}
        >
          <Landmark className="w-3 h-3" />
          <span>BACS</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              paymentFilter === 'bacs'
                ? 'bg-indigo-700 text-white'
                : 'bg-indigo-200/80 dark:bg-indigo-900/80 text-indigo-900 dark:text-indigo-200'
            }`}
          >
            {bacsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onPaymentFilterChange('card')}
          className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
            paymentFilter === 'card'
              ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-400/40'
              : 'bg-sky-50 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 text-sky-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60'
          }`}
        >
          <CreditCard className="w-3 h-3" />
          <span>Card</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              paymentFilter === 'card'
                ? 'bg-sky-700 text-white'
                : 'bg-sky-200/80 dark:bg-sky-900/80 text-sky-900 dark:text-sky-200'
            }`}
          >
            {cardCount}
          </span>
        </button>
      </div>
    </div>
  );
}
