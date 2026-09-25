'use client';

import React, { useState } from 'react';
import {
  Navigation,
  Send,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  X,
  Maximize2,
  Minimize2,
  Compass,
  Banknote,
  CreditCard,
} from 'lucide-react';
import { Customer, NavApp, TravelMode, PaymentStatus } from '@/lib/types';
import { getSingleStopNavUrl } from '@/lib/routeOptimizer';

interface RouteRunnerBarProps {
  stops: Customer[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  onOpenOnMyWay: (customer: Customer) => void;
  onMarkComplete: (customer: Customer) => void;
  onUpdatePaymentStatus?: (customer: Customer, status: PaymentStatus) => void;
  onOpenMapModal: () => void;
  onCloseRunner: () => void;
  navApp: NavApp;
  travelMode?: TravelMode;
  finishAddress?: string;
  isCompleting?: boolean;
}

export function RouteRunnerBar({
  stops,
  currentIndex,
  onSelectIndex,
  onOpenOnMyWay,
  onMarkComplete,
  onUpdatePaymentStatus,
  onOpenMapModal,
  onCloseRunner,
  navApp,
  travelMode = 'walking',
  finishAddress,
  isCompleting = false,
}: RouteRunnerBarProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (stops.length === 0) return null;

  const currentCustomer = stops[currentIndex] || stops[0];
  const totalStops = stops.length;
  const completedStops = stops.filter((s) => s.lastCleanedDate === new Date().toISOString().split('T')[0]).length;
  const progressPercent = Math.round((completedStops / totalStops) * 100);
  const isLastStop = currentIndex === totalStops - 1;

  const handleNavigate = () => {
    const url = getSingleStopNavUrl(currentCustomer.address, navApp, travelMode);
    window.open(url, '_blank');
  };

  const handlePrev = () => {
    if (currentIndex > 0) onSelectIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < stops.length - 1) onSelectIndex(currentIndex + 1);
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto">
        <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl p-3 flex items-center justify-between border border-slate-700 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center font-black text-xs">
              #{currentIndex + 1}
            </div>
            <div className="truncate max-w-[180px] sm:max-w-[220px]">
              <span className="font-bold text-xs block truncate text-slate-100">{currentCustomer.name}</span>
              <span className="text-[10px] text-slate-400 block truncate">{currentCustomer.address}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleNavigate}
              className="p-2 bg-brand-600 hover:bg-brand-500 rounded-xl text-white cursor-pointer"
              title={travelMode === 'walking' ? 'Walk to stop' : 'Drive to stop'}
            >
              <Navigation className="w-4 h-4 fill-white" />
            </button>
            <button
              onClick={() => setIsMinimized(false)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 cursor-pointer"
              title="Expand"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 bg-slate-900/98 backdrop-blur-lg border-t border-slate-800 text-white shadow-2xl animate-in slide-in-from-bottom duration-200">
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-4 space-y-2.5">
        {/* Progress bar */}
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-linear-to-r from-brand-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header row: Stop counter, Map trigger, Minimize, Close */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold px-2 py-0.5 rounded-lg bg-brand-500 text-white text-[11px] shadow-xs">
              STOP {currentIndex + 1} OF {totalStops}
            </span>
            <span className="text-slate-400 text-[11px] font-medium">
              {completedStops} done • {totalStops - completedStops} remaining
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onOpenMapModal}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold rounded-lg flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Map & List</span>
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Minimize"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onCloseRunner}
              className="p-1 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
              title="Exit Route"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Doorstep Home Notification on Last Stop */}
        {isLastStop && finishAddress && (
          <div className="bg-sky-500/15 border border-sky-400/30 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-sky-200">
            <span className="flex items-center gap-1.5 font-bold">
              <span>🏁</span> Final Stop of the Round
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-sky-300 font-medium truncate max-w-[160px] sm:max-w-[200px]">
                Home ({finishAddress.split(',')[0]})
              </span>
              <button
                type="button"
                onClick={() => {
                  const url = getSingleStopNavUrl(finishAddress, navApp, travelMode);
                  window.open(url, '_blank');
                }}
                className="px-2 py-0.5 bg-sky-500 hover:bg-sky-400 text-slate-900 font-extrabold rounded-lg text-[10px] cursor-pointer transition-colors"
                title="Navigate home"
              >
                {travelMode === 'walking' ? '🚶 Walk Home' : '🚗 Drive Home'}
              </button>
            </div>
          </div>
        )}

        {/* Customer Info Card */}
        <div className="flex items-start justify-between gap-3 bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-extrabold text-sm text-white truncate">{currentCustomer.name}</h4>
              <span className="font-extrabold text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                £{currentCustomer.price}
              </span>
            </div>
            <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              <span className="truncate">{currentCustomer.address}</span>
            </p>
            {currentCustomer.notes && (
              <p className="text-[11px] text-amber-300/90 italic mt-1 line-clamp-1">
                💬 {currentCustomer.notes}
              </p>
            )}
          </div>

          {/* Stepper Chevrons */}
          <div className="flex items-center gap-1 shrink-0 self-center">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              title="Previous Stop"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === totalStops - 1}
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              title="Next Stop"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Payment Toggles for Active Stop */}
        {onUpdatePaymentStatus && (
          <div className="flex items-center justify-between gap-2 px-1 text-xs">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
              <span>Payment:</span>
              <span className="text-slate-300 font-bold">
                {currentCustomer.paymentStatus === 'cash'
                  ? 'Paid Cash'
                  : currentCustomer.paymentStatus === 'card'
                  ? 'Paid Card'
                  : 'Unpaid'}
              </span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onUpdatePaymentStatus(currentCustomer, 'unpaid')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  currentCustomer.paymentStatus === 'unpaid' || !currentCustomer.paymentStatus
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Unpaid
              </button>
              <button
                type="button"
                onClick={() => onUpdatePaymentStatus(currentCustomer, 'cash')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  currentCustomer.paymentStatus === 'cash'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Banknote className="w-3 h-3" />
                <span>Cash</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdatePaymentStatus(currentCustomer, 'card')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  currentCustomer.paymentStatus === 'card'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-3 h-3" />
                <span>Card</span>
              </button>
            </div>
          </div>
        )}

        {/* Big Action Buttons (Thumb-friendly on mobile) */}
        <div className="grid grid-cols-3 gap-2">
          {/* 1. Walk / Drive */}
          <button
            onClick={handleNavigate}
            className="py-2.5 px-2 bg-sky-600 hover:bg-sky-500 active:scale-97 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Navigation className="w-4 h-4 fill-white" />
            <span>{travelMode === 'walking' ? 'Walk' : 'Drive'}</span>
          </button>

          {/* 2. On My Way SMS */}
          <button
            onClick={() => onOpenOnMyWay(currentCustomer)}
            className="py-2.5 px-2 bg-indigo-600 hover:bg-indigo-500 active:scale-97 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>On My Way</span>
          </button>

          {/* 3. Mark Complete & Advance */}
          <button
            onClick={() => onMarkComplete(currentCustomer)}
            disabled={isCompleting}
            className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-500 active:scale-97 disabled:bg-slate-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
}
