'use client';

import React, { useState } from 'react';
import { 
  Phone, 
  MapPin, 
  Send, 
  Check, 
  MoreVertical, 
  Calendar, 
  Clock, 
  AlertTriangle,
  RotateCcw,
  Pencil
} from 'lucide-react';
import { Customer } from '@/lib/types';
import { formatFriendlyDue, formatDateDisplay, getTodayDateString } from '@/lib/dateUtils';

interface CustomerCardProps {
  customer: Customer;
  onOpenOnMyWay: (customer: Customer) => void;
  onMarkComplete: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  isCompleting?: boolean;
}

export function CustomerCard({
  customer,
  onOpenOnMyWay,
  onMarkComplete,
  onEdit,
  isCompleting = false,
}: CustomerCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const todayStr = getTodayDateString();
  const isDoneToday = customer.lastCleanedDate === todayStr;
  const dueInfo = formatFriendlyDue(customer.nextDueDate, todayStr);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    customer.address
  )}`;

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
        isDoneToday
          ? 'border-emerald-200 bg-emerald-50/20'
          : dueInfo.isUrgent
          ? 'border-red-300 ring-1 ring-red-200'
          : dueInfo.isToday
          ? 'border-amber-300 ring-1 ring-amber-200'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top Header Section of Card */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-base text-slate-900 leading-snug truncate">
                {customer.name}
              </h3>
              
              {/* Due Status Badge */}
              {isDoneToday ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <Check className="w-3 h-3 stroke-[3]" />
                  Done Today
                </span>
              ) : (
                <span
                  className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border ${dueInfo.colorClass}`}
                >
                  {dueInfo.isUrgent && <AlertTriangle className="w-3 h-3 mr-1" />}
                  {dueInfo.text}
                </span>
              )}

              {customer.status === 'paused' && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  Paused
                </span>
              )}
            </div>

            {/* Address */}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-brand-600 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-600 shrink-0" />
              <span className="underline-offset-2 group-hover:underline">
                {customer.address}
              </span>
            </a>
          </div>

          {/* Price & Frequency Pill */}
          <div className="text-right shrink-0 flex flex-col items-end">
            <span className="text-lg font-extrabold text-slate-900 leading-tight">
              £{customer.price}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              Every {customer.frequencyWeeks}w
            </span>
          </div>
        </div>

        {/* Customer Notes (Important for window cleaner: dog, gate codes, etc.) */}
        {customer.notes && (
          <div className="mt-2.5 p-2 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
            <span className="font-bold shrink-0 text-amber-700">Note:</span>
            <span className="leading-relaxed">{customer.notes}</span>
          </div>
        )}

        {/* Clean History info */}
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last cleaned: {customer.lastCleanedDate ? formatDateDisplay(customer.lastCleanedDate) : 'Never'}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Next: {formatDateDisplay(customer.nextDueDate)}
          </span>
        </div>
      </div>

      {/* Action Buttons Bar - Big outdoor-friendly touch targets */}
      <div className="bg-slate-50/90 border-t border-slate-100 px-3 py-2.5 flex items-center gap-2">
        {/* "On My Way" Button */}
        <button
          onClick={() => onOpenOnMyWay(customer)}
          className="flex-1 min-w-0 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white py-2.5 px-3 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm shadow-brand-600/20 transition-all"
        >
          <Send className="w-4 h-4 shrink-0" />
          <span className="truncate">On My Way</span>
        </button>

        {/* Quick Call */}
        {customer.phone ? (
          <a
            href={`tel:${customer.phone}`}
            title={`Call ${customer.name}`}
            className="w-10 h-10 shrink-0 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center transition-all active:scale-95"
          >
            <Phone className="w-4 h-4 text-emerald-600" />
          </a>
        ) : (
          <button
            disabled
            title="No phone number saved"
            className="w-10 h-10 shrink-0 bg-slate-100 border border-slate-200 text-slate-300 rounded-xl flex items-center justify-center cursor-not-allowed"
          >
            <Phone className="w-4 h-4" />
          </button>
        )}

        {/* Google Maps Directions */}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in Maps"
          className="w-10 h-10 shrink-0 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center transition-all active:scale-95"
        >
          <MapPin className="w-4 h-4 text-blue-600" />
        </a>

        {/* Mark Cleaned / Done Button */}
        <button
          onClick={() => onMarkComplete(customer)}
          disabled={isCompleting}
          title={isDoneToday ? 'Re-mark completed' : 'Mark job completed'}
          className={`px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
            isDoneToday
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20'
          }`}
        >
          {isCompleting ? (
            <RotateCcw className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4 stroke-[3]" />
          )}
          <span>{isDoneToday ? 'Done' : 'Done'}</span>
        </button>

        {/* Edit Button */}
        <button
          onClick={() => onEdit(customer)}
          title="Edit customer details"
          className="w-10 h-10 shrink-0 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center transition-all active:scale-95"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
