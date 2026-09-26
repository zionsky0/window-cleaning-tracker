'use client';

import React, { useState, useMemo } from 'react';
import {
  Clock,
  Banknote,
  CreditCard,
  Search,
  X,
  Send,
  Phone,
  Check,
  AlertCircle,
  Pencil,
  MapPin,
  Calendar,
  Sparkles,
  Landmark,
} from 'lucide-react';
import { Customer, PaymentStatus } from '@/lib/types';
import { formatDateDisplay, getDaysDifference, getTodayDateString } from '@/lib/dateUtils';
import { PaymentReminderModal } from './PaymentReminderModal';

interface UnpaidViewProps {
  customers: Customer[];
  onUpdatePaymentStatus: (customer: Customer, status: PaymentStatus) => void;
  onEditCustomer: (customer: Customer) => void;
  businessName?: string;
  cashTotal: number;
  cashCount: number;
  bacsTotal?: number;
  bacsCount?: number;
  cardTotal: number;
  cardCount: number;
}

export function UnpaidView({
  customers,
  onUpdatePaymentStatus,
  onEditCustomer,
  businessName = 'ClearView',
  cashTotal,
  cashCount,
  bacsTotal = 0,
  bacsCount = 0,
  cardTotal,
  cardCount,
}: UnpaidViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [reminderCustomer, setReminderCustomer] = useState<Customer | null>(null);
  const [filterAge, setFilterAge] = useState<'all' | '7days' | '14days'>('all');
  const todayStr = getTodayDateString();

  // All active unpaid customers
  const unpaidCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (c.status === 'paused') return false;
      return (c.paymentStatus || 'unpaid') === 'unpaid';
    });
  }, [customers]);

  const totalUnpaidAmount = useMemo(() => {
    return unpaidCustomers.reduce((sum, c) => sum + c.price, 0);
  }, [unpaidCustomers]);

  // Filtered unpaid customers
  const filteredUnpaid = useMemo(() => {
    let list = unpaidCustomers;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q) ||
          c.phone.includes(q)
      );
    }

    if (filterAge === '7days') {
      list = list.filter((c) => {
        if (!c.lastCleanedDate) return true;
        const diff = getDaysDifference(todayStr, c.lastCleanedDate);
        return diff >= 7;
      });
    } else if (filterAge === '14days') {
      list = list.filter((c) => {
        if (!c.lastCleanedDate) return true;
        const diff = getDaysDifference(todayStr, c.lastCleanedDate);
        return diff >= 14;
      });
    }

    // Sort by largest debt first or most overdue
    return list.sort((a, b) => b.price - a.price);
  }, [unpaidCustomers, searchQuery, filterAge, todayStr]);

  return (
    <div className="space-y-3">
      {/* Top Unpaid Summary Card */}
      <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white rounded-2xl p-4 sm:p-5 shadow-lg shadow-amber-600/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-100 uppercase tracking-wider block">
                Total Outstanding
              </span>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight">
                £{totalUnpaidAmount}
              </h2>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-extrabold">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              {unpaidCustomers.length} unpaid customer{unpaidCustomers.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Collected Today / Round Stats */}
        <div className="mt-4 pt-3 border-t border-white/20 grid grid-cols-3 gap-2 text-xs">
          <div className="bg-white/10 rounded-xl p-2 flex flex-col justify-between">
            <div className="flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="font-semibold text-amber-100 text-[11px] truncate">Cash</span>
            </div>
            <span className="font-black text-white mt-1 text-xs truncate">
              £{cashTotal} ({cashCount})
            </span>
          </div>

          <div className="bg-white/10 rounded-xl p-2 flex flex-col justify-between">
            <div className="flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              <span className="font-semibold text-amber-100 text-[11px] truncate">BACS</span>
            </div>
            <span className="font-black text-white mt-1 text-xs truncate">
              £{bacsTotal} ({bacsCount})
            </span>
          </div>

          <div className="bg-white/10 rounded-xl p-2 flex flex-col justify-between">
            <div className="flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-sky-200 shrink-0" />
              <span className="font-semibold text-amber-100 text-[11px] truncate">Card</span>
            </div>
            <span className="font-black text-white mt-1 text-xs truncate">
              £{cardTotal} ({cardCount})
            </span>
          </div>
        </div>
      </div>

      {/* Search and Quick Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs space-y-2.5 transition-colors duration-200">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search unpaid customers by name, street..."
            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter age chips */}
        <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-0.5">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase mr-1">Filter:</span>
          <button
            onClick={() => setFilterAge('all')}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 cursor-pointer ${
              filterAge === 'all'
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            All Unpaid ({unpaidCustomers.length})
          </button>
          <button
            onClick={() => setFilterAge('7days')}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 cursor-pointer ${
              filterAge === '7days'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}
          >
            Cleaned &gt; 7 days ago
          </button>
          <button
            onClick={() => setFilterAge('14days')}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 cursor-pointer ${
              filterAge === '14days'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            Cleaned &gt; 14 days ago
          </button>
        </div>
      </div>

      {/* Unpaid Customer List */}
      {filteredUnpaid.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">
              {searchQuery ? 'No matching unpaid customers' : 'All caught up! Zero unpaid balances'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              {searchQuery
                ? `No unpaid results for "${searchQuery}".`
                : 'Everyone has paid their dues. Cash and card collections are up to date.'}
            </p>
          </div>
        </div>
      ) : (
        filteredUnpaid.map((customer) => {
          const daysAgo = customer.lastCleanedDate
            ? getDaysDifference(todayStr, customer.lastCleanedDate)
            : null;

          return (
            <div
              key={customer.id}
              className="bg-white dark:bg-slate-800/90 rounded-2xl border border-amber-200 dark:border-amber-800/70 p-4 shadow-xs space-y-3 transition-colors duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                      {customer.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                      <Clock className="w-3 h-3" />
                      Unpaid
                    </span>
                  </div>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      customer.address
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 hover:text-brand-600"
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{customer.address}</span>
                  </a>

                  {/* Clean timing info */}
                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {customer.lastCleanedDate ? (
                      <span>
                        Cleaned {formatDateDisplay(customer.lastCleanedDate)}
                        {daysAgo !== null && (
                          <span className="font-bold text-amber-700 dark:text-amber-400 ml-1">
                            ({daysAgo} day{daysAgo !== 1 ? 's' : ''} ago)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span>Not yet cleaned</span>
                    )}
                  </div>
                </div>

                {/* Amount Owed */}
                <div className="text-right shrink-0">
                  <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block leading-tight">
                    £{customer.price}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 block">
                    Outstanding
                  </span>
                </div>
              </div>

              {/* 1-Tap Payment & Reminder Actions Bar */}
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between gap-2 flex-wrap">
                {/* 1-Tap Cash / BACS / Card Logger */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onUpdatePaymentStatus(customer, 'cash')}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                    title="Mark paid in cash"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdatePaymentStatus(customer, 'bacs')}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                    title="Mark paid via BACS bank transfer"
                  >
                    <Landmark className="w-3.5 h-3.5" />
                    <span>BACS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdatePaymentStatus(customer, 'card')}
                    className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                    title="Mark paid by card"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Card</span>
                  </button>
                </div>

                {/* Remind & Contact Buttons */}
                <div className="flex items-center gap-1.5">
                  {/* Send Reminder */}
                  <button
                    type="button"
                    onClick={() => setReminderCustomer(customer)}
                    className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Send SMS or WhatsApp payment reminder"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-600" />
                    <span>Remind</span>
                  </button>

                  {/* Call button */}
                  {customer.phone && (
                    <a
                      href={`tel:${customer.phone}`}
                      className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
                      title={`Call ${customer.name}`}
                    >
                      <Phone className="w-4 h-4 text-emerald-600" />
                    </a>
                  )}

                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={() => onEditCustomer(customer)}
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors cursor-pointer"
                    title="Edit customer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Payment Reminder Modal */}
      {reminderCustomer && (
        <PaymentReminderModal
          customer={reminderCustomer}
          businessName={businessName}
          onClose={() => setReminderCustomer(null)}
        />
      )}
    </div>
  );
}
