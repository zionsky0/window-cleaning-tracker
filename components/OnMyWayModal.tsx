'use client';

import React, { useState } from 'react';
import { X, Send, MessageSquare, ExternalLink, Clock, Sparkles } from 'lucide-react';
import { Customer } from '@/lib/types';

interface OnMyWayModalProps {
  customer: Customer | null;
  onClose: () => void;
}

export function OnMyWayModal({ customer, onClose }: OnMyWayModalProps) {
  if (!customer) return null;

  const [eta, setEta] = useState<'10-15 mins' | '5 mins' | '20-30 mins' | 'Just arrived'>('10-15 mins');
  const [method, setMethod] = useState<'sms' | 'whatsapp'>(
    customer.preferredContact === 'whatsapp' ? 'whatsapp' : 'sms'
  );

  // Generate personalized text based on selected ETA
  const firstName = customer.name.split(' ')[0];
  let customMessage = '';
  if (eta === 'Just arrived') {
    customMessage = `Hi ${firstName}, it's your window cleaner. I've just arrived outside to clean your windows!`;
  } else {
    customMessage = `Hi ${firstName}, it's your window cleaner. I'm on my way to your house now (about ${eta})! See you shortly.`;
  }

  const [message, setMessage] = useState(customMessage);

  // When ETA chip clicked, update message
  const handleEtaChange = (newEta: typeof eta) => {
    setEta(newEta);
    if (newEta === 'Just arrived') {
      setMessage(`Hi ${firstName}, it's your window cleaner. I've just arrived outside to clean your windows!`);
    } else {
      setMessage(`Hi ${firstName}, it's your window cleaner. I'm on my way to your house now (about ${newEta})! See you shortly.`);
    }
  };

  // Clean phone number for links
  const rawPhone = customer.phone.replace(/\s+/g, '');
  
  // Format UK or international phone for WhatsApp (e.g. 07... -> 447...)
  let waPhone = rawPhone;
  if (waPhone.startsWith('0')) {
    waPhone = '44' + waPhone.slice(1);
  }
  waPhone = waPhone.replace('+', '');

  // Native SMS link (compatible with iOS and Android)
  const encodedBody = encodeURIComponent(message);
  // On iOS, sms:1234&body=... or sms:1234?&body=... works, on Android ?body=... works.
  // Using sms:number?&body=message is the universal cross-platform standard for mobile browsers.
  const smsUrl = `sms:${rawPhone}?&body=${encodedBody}`;
  const whatsAppUrl = `https://wa.me/${waPhone}?text=${encodedBody}`;

  const handleSend = () => {
    if (method === 'whatsapp') {
      window.open(whatsAppUrl, '_blank');
    } else {
      window.location.href = smsUrl;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 transition-colors duration-200">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">Send "On My Way"</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                To {customer.name} ({customer.phone || 'No phone'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Method Selector: SMS vs WhatsApp */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">
              Send via:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod('sms')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  method === 'sms'
                    ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>📱 Text Message (SMS)</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod('whatsapp')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  method === 'whatsapp'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>💬 WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Quick ETA Selector Chips */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              Quick Arrival Time:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['10-15 mins', '5 mins', '20-30 mins', 'Just arrived'] as const).map((timeOption) => (
                <button
                  key={timeOption}
                  type="button"
                  onClick={() => handleEtaChange(timeOption)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold text-left transition-all border cursor-pointer ${
                    eta === timeOption
                      ? 'bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 text-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {timeOption}
                </button>
              ))}
            </div>
          </div>

          {/* Editable Message Box */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">
              Message preview (you can edit):
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
            />
          </div>

          <div className="bg-sky-50 dark:bg-sky-950/40 rounded-xl p-3 text-[11px] text-sky-800 dark:text-sky-200 leading-relaxed flex items-start gap-2 border border-sky-100 dark:border-sky-800/60">
            <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
            <span>
              Tapping <strong>Send</strong> will open your phone's {method === 'whatsapp' ? 'WhatsApp' : 'Messages'} app with this text already filled in. Just hit send!
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex gap-2 transition-colors">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleSend}
            disabled={!customer.phone}
            className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 text-white font-bold text-sm rounded-xl shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Open {method === 'whatsapp' ? 'WhatsApp' : 'Messages'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
