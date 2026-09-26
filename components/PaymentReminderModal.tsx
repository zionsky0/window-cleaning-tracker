'use client';

import React, { useState, useMemo } from 'react';
import { X, Send, MessageSquare, Copy, Check, Clock, Banknote, CreditCard, Building } from 'lucide-react';
import { Customer } from '@/lib/types';
import { formatDateDisplay } from '@/lib/dateUtils';
import { getLocalBankDetails } from '@/lib/storage';

interface PaymentReminderModalProps {
  customer: Customer | null;
  businessName?: string;
  onClose: () => void;
}

export function PaymentReminderModal({
  customer,
  businessName = 'ClearView',
  onClose,
}: PaymentReminderModalProps) {
  const [copied, setCopied] = useState(false);
  const [method, setMethod] = useState<'sms' | 'whatsapp'>(
    customer?.preferredContact === 'whatsapp' ? 'whatsapp' : 'sms'
  );

  const bankDetails = useMemo(() => getLocalBankDetails(), []);

  const firstName = customer ? customer.name.split(' ')[0] : '';
  const cleanedDateText = customer?.lastCleanedDate
    ? `on ${formatDateDisplay(customer.lastCleanedDate)}`
    : 'recently';
  const refText = customer?.address ? customer.address.split(',')[0].trim() : (customer?.name || '');

  // Formulate bank line
  const bankLine = useMemo(() => {
    let line = '';
    if (bankDetails.sortCode && bankDetails.accountNumber) {
      line += `\nBank: Sort: ${bankDetails.sortCode} | Acc: ${bankDetails.accountNumber} | Ref: ${refText}`;
    }
    if (bankDetails.payLinkUrl) {
      line += `\nOr pay online: ${bankDetails.payLinkUrl}`;
    }
    return line;
  }, [bankDetails, refText]);

  const templateWithBank = `Hi ${firstName}, hope you're well! Just a quick message from ${businessName} regarding your window clean ${cleanedDateText} for £${customer?.price || 0}.${bankLine || '\nPayment can be made by bank transfer or cash.'}\nIf you've already sent payment, please ignore this! Thank you.`;

  const templateFriendly = `Hi ${firstName}, hope you're having a great week! Just a friendly note from ${businessName} that your window clean of £${customer?.price || 0} is due.${bankLine}\nMany thanks!`;

  const templateOverdue = `Hi ${firstName}, this is a gentle reminder from ${businessName} that your window clean balance of £${customer?.price || 0} remains outstanding.${bankLine}\nPlease settle when you have a moment to keep your spot on our regular round. Thank you.`;

  const [message, setMessage] = useState(templateWithBank);

  if (!customer) return null;

  // Clean phone number for links
  const rawPhone = (customer.phone || '').replace(/\s+/g, '');
  let waPhone = rawPhone;
  if (waPhone.startsWith('0')) {
    waPhone = '44' + waPhone.slice(1);
  }
  waPhone = waPhone.replace('+', '');

  const encodedBody = encodeURIComponent(message);
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 transition-colors duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                Send Payment Reminder
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {customer.name} • <span className="font-bold text-amber-600 dark:text-amber-400">£{customer.price} Owed</span>
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

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Method Selector: SMS vs WhatsApp */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 block">
              Send Reminder via:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod('sms')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  method === 'sms'
                    ? 'border-brand-500 bg-brand-50/80 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>Text Message (SMS)</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('whatsapp')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  method === 'whatsapp'
                    ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Message Preview & Edit */}
          <div>
            {/* Quick Templates */}
            <div className="mb-2.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Message Template:
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setMessage(templateWithBank)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    message === templateWithBank
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Bank Details
                </button>
                <button
                  type="button"
                  onClick={() => setMessage(templateFriendly)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    message === templateFriendly
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Friendly
                </button>
                <button
                  type="button"
                  onClick={() => setMessage(templateOverdue)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    message === templateOverdue
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Overdue Notice
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Message Text:
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none transition-all"
            />
          </div>

          {/* Quick preset buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setMessage(
                  `Hi ${firstName}, ClearView window cleaner here! Just a quick reminder that £${customer.price} is due for your window clean ${cleanedDateText}. Bank transfer or cash is fine. Thanks!`
                )
              }
              className="flex-1 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 text-center transition-colors"
            >
              Short & Sweet
            </button>
            <button
              type="button"
              onClick={() =>
                setMessage(
                  `Hi ${firstName}, friendly note regarding your £${customer.price} window clean from ClearView. Please let us know once transferred so we can mark it paid. Have a great day!`
                )
              }
              className="flex-1 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 text-center transition-colors"
            >
              Polite Follow-up
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={!customer.phone}
            className={`flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98 ${
              !customer.phone
                ? 'bg-slate-400 cursor-not-allowed'
                : method === 'whatsapp'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/20'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>
              {customer.phone
                ? `Send via ${method === 'whatsapp' ? 'WhatsApp' : 'Messages'}`
                : 'No Phone Number'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
