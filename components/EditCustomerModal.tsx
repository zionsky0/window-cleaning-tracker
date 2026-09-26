'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit3, PoundSterling, Calendar, Phone, MapPin, FileText, Check, Trash2, Banknote, CreditCard, Clock, Landmark } from 'lucide-react';
import { Customer, FrequencyWeeks, PaymentStatus } from '@/lib/types';
import { getTodayDateString } from '@/lib/dateUtils';

interface EditCustomerModalProps {
  customer: Customer | null;
  onClose: () => void;
  onUpdateCustomer: (id: string, updates: Partial<Customer>) => void;
  onDeleteCustomer: (id: string) => void;
}

export function EditCustomerModal({
  customer,
  onClose,
  onUpdateCustomer,
  onDeleteCustomer,
}: EditCustomerModalProps) {
  if (!customer) return null;

  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [address, setAddress] = useState(customer.address);
  const [price, setPrice] = useState(String(customer.price));
  const [frequencyWeeks, setFrequencyWeeks] = useState<FrequencyWeeks>(customer.frequencyWeeks);
  const [nextDueDate, setNextDueDate] = useState(customer.nextDueDate);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(customer.paymentStatus || 'unpaid');
  const [notes, setNotes] = useState(customer.notes || '');
  const [status, setStatus] = useState<'active' | 'paused'>(customer.status);
  const [preferredContact, setPreferredContact] = useState<'sms' | 'whatsapp'>(customer.preferredContact || 'sms');

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone);
      setAddress(customer.address);
      setPrice(String(customer.price));
      setFrequencyWeeks(customer.frequencyWeeks);
      setNextDueDate(customer.nextDueDate);
      setPaymentStatus(customer.paymentStatus || 'unpaid');
      setNotes(customer.notes || '');
      setStatus(customer.status);
      setPreferredContact(customer.preferredContact || 'sms');
    }
  }, [customer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      return;
    }

    onUpdateCustomer(customer.id, {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      price: Number(price) || 0,
      frequencyWeeks,
      nextDueDate,
      paymentStatus,
      paymentDate: paymentStatus !== 'unpaid' ? (customer.paymentDate || getTodayDateString()) : undefined,
      notes: notes.trim(),
      status,
      preferredContact,
    });

    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to remove ${customer.name}?`)) {
      onDeleteCustomer(customer.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 transition-colors duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">Edit Customer</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{customer.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Active / Paused Selector */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors">
            <button
              type="button"
              onClick={() => setStatus('active')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                status === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Active Customer
            </button>
            <button
              type="button"
              onClick={() => setStatus('paused')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                status === 'paused'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Paused (Holiday / Break)
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-semibold transition-colors"
            />
          </div>

          {/* Address */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              Street Address *
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Price & Frequency Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                <PoundSterling className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                Price per Clean (£)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Cleaning Frequency
              </label>
              <select
                value={frequencyWeeks}
                onChange={(e) => setFrequencyWeeks(Number(e.target.value) as FrequencyWeeks)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
              >
                <option value={2}>Every 2 weeks</option>
                <option value={4}>Every 4 weeks</option>
                <option value={6}>Every 6 weeks</option>
                <option value={8}>Every 8 weeks</option>
                <option value={12}>Every 12 weeks</option>
              </select>
            </div>
          </div>

          {/* Next Due Date */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              Next Due Date
            </label>
            <input
              type="date"
              required
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Payment Status Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                Payment Status
              </span>
              <span className="text-[11px] font-normal text-slate-400">
                {paymentStatus === 'unpaid'
                  ? 'Owed / Pending'
                  : paymentStatus === 'cash'
                  ? 'Paid in Cash'
                  : paymentStatus === 'bacs'
                  ? 'Paid via BACS Transfer'
                  : 'Paid by Card'}
              </span>
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setPaymentStatus('unpaid')}
                className={`py-2 px-1 rounded-lg font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                  paymentStatus === 'unpaid'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[11px]">Unpaid</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus('cash')}
                className={`py-2 px-1 rounded-lg font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                  paymentStatus === 'cash'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span className="text-[11px]">Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus('bacs')}
                className={`py-2 px-1 rounded-lg font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                  paymentStatus === 'bacs'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span className="text-[11px]">BACS</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus('card')}
                className={`py-2 px-1 rounded-lg font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                  paymentStatus === 'card'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span className="text-[11px]">Card</span>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              Customer Notes / Gate Codes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Save Changes</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="w-1/2 py-2.5 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
