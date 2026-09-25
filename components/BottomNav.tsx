'use client';

import React from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  Users,
  BarChart3,
  CheckCircle2,
  Banknote
} from 'lucide-react';

export type MainNavTab = 'today' | 'month' | 'unpaid' | 'customers' | 'more';

interface BottomNavProps {
  currentTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
  todayCount: number;
  unpaidCount: number;
  totalCustomersCount: number;
  monthCleansCount: number;
  unpaidAmount: number;
}

export function BottomNav({
  currentTab,
  onTabChange,
  todayCount,
  unpaidCount,
  totalCustomersCount,
  monthCleansCount,
  unpaidAmount,
}: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom,0px)] shadow-lg transition-colors duration-200">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5 h-16">
        {/* Tab 1: Today / Round */}
        <button
          type="button"
          onClick={() => onTabChange('today')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
            currentTab === 'today'
              ? 'text-brand-600 dark:text-brand-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <Sparkles className={`w-5 h-5 transition-transform ${currentTab === 'today' ? 'scale-110' : ''}`} />
            {todayCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 min-w-[18px] text-[10px] font-black rounded-full bg-brand-600 text-white flex items-center justify-center shadow-xs">
                {todayCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-1 leading-none">Today</span>
        </button>

        {/* Tab 2: Month / When & Where */}
        <button
          type="button"
          onClick={() => onTabChange('month')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
            currentTab === 'month'
              ? 'text-brand-600 dark:text-brand-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <Calendar className={`w-5 h-5 transition-transform ${currentTab === 'month' ? 'scale-110' : ''}`} />
          </div>
          <span className="text-[11px] mt-1 leading-none">Month</span>
        </button>

        {/* Tab 3: Unpaid (with alert badge) */}
        <button
          type="button"
          onClick={() => onTabChange('unpaid')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
            currentTab === 'unpaid'
              ? 'text-amber-600 dark:text-amber-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <Clock className={`w-5 h-5 transition-transform ${currentTab === 'unpaid' ? 'scale-110' : ''}`} />
            {unpaidCount > 0 && (
              <span className="absolute -top-1.5 -right-3 px-1.5 py-0.2 min-w-[18px] text-[10px] font-black rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs animate-pulse">
                {unpaidCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-1 leading-none">
            {unpaidCount > 0 ? `Unpaid (£${unpaidAmount})` : 'Unpaid'}
          </span>
        </button>

        {/* Tab 4: Customers Directory */}
        <button
          type="button"
          onClick={() => onTabChange('customers')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
            currentTab === 'customers'
              ? 'text-brand-600 dark:text-brand-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <Users className={`w-5 h-5 transition-transform ${currentTab === 'customers' ? 'scale-110' : ''}`} />
            <span className="absolute -top-1.5 -right-2.5 px-1 py-0.2 min-w-[16px] text-[9px] font-black rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              {totalCustomersCount}
            </span>
          </div>
          <span className="text-[11px] mt-1 leading-none">Customers</span>
        </button>

        {/* Tab 5: More / Stats & Settings */}
        <button
          type="button"
          onClick={() => onTabChange('more')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer relative ${
            currentTab === 'more'
              ? 'text-brand-600 dark:text-brand-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <BarChart3 className={`w-5 h-5 transition-transform ${currentTab === 'more' ? 'scale-110' : ''}`} />
          </div>
          <span className="text-[11px] mt-1 leading-none">More</span>
        </button>
      </div>
    </nav>
  );
}
