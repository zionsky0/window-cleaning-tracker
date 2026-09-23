'use client';

import React, { useRef, useState } from 'react';
import { X, Download, Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import { Customer } from '@/lib/types';
import { customersToCSV, downloadCSV, parseCSVToCustomers } from '@/lib/csvUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onImportCustomers: (newCustomers: Omit<Customer, 'id'>[]) => void;
  businessName: string;
}

export function ExportModal({
  isOpen,
  onClose,
  customers,
  onImportCustomers,
  businessName,
}: ExportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = () => {
    const csv = customersToCSV(customers);
    const dateStr = new Date().toISOString().split('T')[0];
    const safeName = (businessName || 'clearview').toLowerCase().replace(/[^a-z0-9]/g, '-');
    downloadCSV(csv, `${safeName}-customers-${dateStr}.csv`);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseCSVToCustomers(text);
        if (parsed.length > 0) {
          onImportCustomers(parsed);
          setImportStatus(`Successfully imported ${parsed.length} customers!`);
          setTimeout(() => {
            setImportStatus(null);
            onClose();
          }, 1500);
        } else {
          setImportStatus('No valid customers found in CSV. Please verify column headers.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">Spreadsheet & Backup</h2>
              <p className="text-xs text-slate-500">Google Sheets & Excel compatible</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Download CSV / Google Sheets */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-emerald-800">
                Export to Spreadsheet
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                {customers.length} Customers
              </span>
            </div>
            <p className="text-xs text-emerald-950/80 leading-relaxed">
              Download your full customer list with phone numbers, prices, frequencies, and due dates. Ready to open directly in <strong>Google Sheets</strong>, <strong>Excel</strong>, or <strong>Numbers</strong>.
            </p>
            <button
              onClick={handleDownload}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              {copiedNotification ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Google Sheets (.CSV)</span>
                </>
              )}
            </button>
          </div>

          {/* Import CSV */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-600 block">
              Import Existing Customers
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              Have an existing customer spreadsheet? Upload a CSV file and ClearView will import all your rounds automatically.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Choose CSV File to Import</span>
            </button>
          </div>

          {importStatus && (
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-brand-600 shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 rounded-xl font-semibold text-xs text-slate-600 hover:bg-slate-100 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
