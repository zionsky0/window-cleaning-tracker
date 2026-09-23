'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

export type TabType = 'today' | 'week' | 'all' | 'completed';

interface FilterBarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  todayCount: number;
  weekCount: number;
  totalCount: number;
  completedCount: number;
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
}: FilterBarProps) {
  return (
    <div className="bg-white border-b border-slate-200 px-4 pt-2 pb-3 space-y-2.5">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name, street, notes..."
          className="w-full bg-slate-100/80 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
        <button
          onClick={() => onTabChange('today')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            currentTab === 'today'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Up Next</span>
          {todayCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                currentTab === 'today'
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {todayCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange('week')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            currentTab === 'week'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>This Week</span>
          {weekCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                currentTab === 'week'
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {weekCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange('all')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            currentTab === 'all'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>All ({totalCount})</span>
        </button>

        {completedCount > 0 && (
          <button
            onClick={() => onTabChange('completed')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              currentTab === 'completed'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Done ({completedCount})</span>
          </button>
        )}
      </div>
    </div>
  );
}
