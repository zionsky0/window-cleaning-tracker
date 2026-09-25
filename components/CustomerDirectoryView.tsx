'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  X,
  Plus,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Send,
  Check,
  RotateCcw,
  Pencil,
  PauseCircle,
  PlayCircle,
  Banknote,
  CreditCard,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { Customer, PaymentStatus, FrequencyWeeks } from '@/lib/types';
import { formatDateDisplay, getTodayDateString, extractStreetOrArea } from '@/lib/dateUtils';

interface CustomerDirectoryViewProps {
  customers: Customer[];
  onOpenAddCustomer: () => void;
  onOpenCustomerMap: () => void;
  onOpenAreaPlanner: () => void;
  onOpenOnMyWay: (customer: Customer) => void;
  onMarkComplete: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onUpdatePaymentStatus: (customer: Customer, status: PaymentStatus) => void;
  onTogglePauseCustomer: (customer: Customer) => void;
  isCompletingId?: string | null;
}

type SortField = 'name' | 'address' | 'price' | 'nextDue';
type FilterStatus = 'all' | 'active' | 'paused';

export function CustomerDirectoryView({
  customers,
  onOpenAddCustomer,
  onOpenCustomerMap,
  onOpenAreaPlanner,
  onOpenOnMyWay,
  onMarkComplete,
  onEditCustomer,
  onUpdatePaymentStatus,
  onTogglePauseCustomer,
  isCompletingId,
}: CustomerDirectoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [freqFilter, setFreqFilter] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const todayStr = getTodayDateString();

  // Metrics
  const activeCount = useMemo(() => customers.filter((c) => c.status !== 'paused').length, [customers]);
  const pausedCount = customers.length - activeCount;

  const totalCycleValue = useMemo(() => {
    return customers
      .filter((c) => c.status !== 'paused')
      .reduce((sum, c) => sum + c.price, 0);
  }, [customers]);

  const avgPrice = useMemo(() => {
    if (activeCount === 0) return 0;
    return Math.round(totalCycleValue / activeCount);
  }, [totalCycleValue, activeCount]);

  // Filtering & Sorting
  const processedCustomers = useMemo(() => {
    let list = [...customers];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.notes && c.notes.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter === 'active') {
      list = list.filter((c) => c.status !== 'paused');
    } else if (statusFilter === 'paused') {
      list = list.filter((c) => c.status === 'paused');
    }

    // Frequency filter
    if (freqFilter !== 'all') {
      list = list.filter((c) => c.frequencyWeeks === freqFilter);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'address') {
        return a.address.localeCompare(b.address);
      } else if (sortBy === 'price') {
        return b.price - a.price;
      } else if (sortBy === 'nextDue') {
        return a.nextDueDate.localeCompare(b.nextDueDate);
      }
      return 0;
    });

    return list;
  }, [customers, searchQuery, statusFilter, freqFilter, sortBy]);

  return (
    <div className="space-y-3">
      {/* Portfolio Overview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                Customer Directory
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {activeCount} active round{activeCount !== 1 ? 's' : ''}
                {pausedCount > 0 && ` • ${pausedCount} paused`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* View on Map Button */}
            <button
              type="button"
              onClick={onOpenCustomerMap}
              className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 active:scale-95 transition-all cursor-pointer"
              title="See where all customers are on a map"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Map</span>
            </button>

            {/* Auto-Plan by Proximity Button */}
            <button
              type="button"
              onClick={onOpenAreaPlanner}
              className="flex items-center gap-1.5 bg-linear-to-r from-indigo-600 to-brand-600 hover:from-indigo-700 hover:to-brand-700 text-white font-extrabold text-xs px-3 py-2 rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
              title="Auto-plan rounds by area proximity"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Auto-Plan Areas</span>
            </button>

            {/* Add Customer Button */}
            <button
              type="button"
              onClick={onOpenAddCustomer}
              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs px-3 py-2 rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Financial metrics */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Round Portfolio Value</span>
            <span className="font-black text-base text-slate-900 dark:text-white">
              £{totalCycleValue} <span className="text-[11px] font-semibold text-slate-400">/ cycle</span>
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Average Job Price</span>
            <span className="font-black text-base text-slate-900 dark:text-white">
              £{avgPrice} <span className="text-[11px] font-semibold text-slate-400">/ house</span>
            </span>
          </div>
        </div>

        {/* Smart Proximity Clustering Feature Banner */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-linear-to-r from-sky-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-950/40 p-3 rounded-xl border border-sky-100 dark:border-indigo-900/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-indigo-600 to-brand-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Compass className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                Smart Proximity Auto-Planner
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Group close-by customers into compact daily areas (Day 1, Day 2, Day 3)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAreaPlanner}
            className="shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Plan Areas
          </button>
        </div>
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs space-y-2.5 transition-colors duration-200">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, street, phone..."
            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
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

        {/* Filter & Sort Bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-0.5">
          {/* Status Filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              All ({customers.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Active ({activeCount})
            </button>
            {pausedCount > 0 && (
              <button
                onClick={() => setStatusFilter('paused')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 cursor-pointer ${
                  statusFilter === 'paused'
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Paused ({pausedCount})
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="name">Name (A-Z)</option>
              <option value="address">Street Address</option>
              <option value="price">Price (High to Low)</option>
              <option value="nextDue">Next Due Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer List */}
      {processedCustomers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">No customers found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              {searchQuery
                ? `No customers matched "${searchQuery}".`
                : 'Tap Add Customer to record your first client.'}
            </p>
          </div>
        </div>
      ) : (
        processedCustomers.map((customer) => {
          const isDoneToday = customer.lastCleanedDate === todayStr;
          const pStatus: PaymentStatus = customer.paymentStatus || 'unpaid';
          const isPaused = customer.status === 'paused';

          return (
            <div
              key={customer.id}
              className={`bg-white dark:bg-slate-800/90 rounded-2xl border transition-all duration-200 p-4 shadow-xs space-y-3 ${
                isPaused
                  ? 'border-slate-200 dark:border-slate-800 opacity-70 bg-slate-50/50 dark:bg-slate-900/50'
                  : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                      {customer.name}
                    </h3>

                    {isPaused ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        Paused
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        Active
                      </span>
                    )}

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Every {customer.frequencyWeeks}w
                    </span>
                  </div>

                  {/* Address */}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      customer.address
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-brand-600"
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{customer.address}</span>
                  </a>

                  {/* Phone */}
                  {customer.phone && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{customer.phone}</span>
                    </div>
                  )}

                  {/* Notes */}
                  {customer.notes && (
                    <div className="mt-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                      <span className="font-bold">Note: </span>
                      <span>{customer.notes}</span>
                    </div>
                  )}

                  {/* Schedule dates */}
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last: {formatDateDisplay(customer.lastCleanedDate)}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                      <Calendar className="w-3 h-3" />
                      Next: {formatDateDisplay(customer.nextDueDate)}
                    </span>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right shrink-0">
                  <span className="text-xl font-black text-slate-900 dark:text-white block leading-tight">
                    £{customer.price}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 block">
                    Per clean
                  </span>
                </div>
              </div>

              {/* Payment Status Bar */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400">Status:</span>
                  {pStatus === 'cash' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      <Banknote className="w-3 h-3" /> Paid Cash
                    </span>
                  ) : pStatus === 'card' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                      <CreditCard className="w-3 h-3" /> Paid Card
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                      <Clock className="w-3 h-3" /> Unpaid
                    </span>
                  )}
                </div>

                {/* 1-tap payment toggle */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => onUpdatePaymentStatus(customer, 'unpaid')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                      pStatus === 'unpaid'
                        ? 'bg-amber-500 text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Unpaid
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdatePaymentStatus(customer, 'cash')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                      pStatus === 'cash'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdatePaymentStatus(customer, 'card')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                      pStatus === 'card'
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Card
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  {/* Call */}
                  {customer.phone ? (
                    <a
                      href={`tel:${customer.phone}`}
                      title={`Call ${customer.name}`}
                      className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  ) : null}

                  {/* On My Way */}
                  <button
                    onClick={() => onOpenOnMyWay(customer)}
                    title="Send On My Way message"
                    className="p-2 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 hover:bg-brand-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>

                  {/* Toggle Active / Paused */}
                  <button
                    onClick={() => onTogglePauseCustomer(customer)}
                    title={isPaused ? 'Resume round' : 'Pause round'}
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                  >
                    {isPaused ? (
                      <PlayCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <PauseCircle className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Mark complete toggle */}
                  <button
                    onClick={() => onMarkComplete(customer)}
                    disabled={isCompletingId === customer.id}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      isDoneToday
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {isCompletingId === customer.id ? (
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                    <span>{isDoneToday ? 'Cleaned Today' : 'Mark Done'}</span>
                  </button>

                  {/* Edit Customer */}
                  <button
                    onClick={() => onEditCustomer(customer)}
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                    title="Edit customer details"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
