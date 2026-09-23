'use client';

import React, { useRef, useState } from 'react';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Sparkles,
  Copy,
  ClipboardCheck,
} from 'lucide-react';
import { Customer } from '@/lib/types';
import { customersToCSV, downloadCSV, parseCSVToCustomers } from '@/lib/csvUtils';
import { getTodayDateString } from '@/lib/dateUtils';

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
  const [downloadNotification, setDownloadNotification] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [pastedCSV, setPastedCSV] = useState('');
  const [showPaster, setShowPaster] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const todayStr = getTodayDateString();

  const aiPromptText = `I have a list of window cleaning customers from my notes. Please convert them into a CSV table with exactly these columns:
Name,Phone,Address,Price,FrequencyWeeks,NextDueDate,Notes

Rules:
1. Name: Customer full name.
2. Phone: UK mobile or landline (format as 07xxx or digits).
3. Address: Full street address or area.
4. Price: Numbers only (no £ sign). Default to 25 if not specified.
5. FrequencyWeeks: Cleaning frequency in weeks (must be 2, 4, 6, 8, or 12). Default to 4.
6. NextDueDate: Date in YYYY-MM-DD format (use ${todayStr} if not specified).
7. Notes: Gate codes, key locations, or special instructions.
8. Output ONLY raw CSV text starting with the header line. No markdown formatting, no commentary.

Here are my customer notes:
[PASTE YOUR NOTEPAD NOTES HERE]`;

  const handleDownload = () => {
    const csv = customersToCSV(customers);
    const dateStr = new Date().toISOString().split('T')[0];
    const safeName = (businessName || 'clearview').toLowerCase().replace(/[^a-z0-9]/g, '-');
    downloadCSV(csv, `${safeName}-customers-${dateStr}.csv`);
    setDownloadNotification(true);
    setTimeout(() => setDownloadNotification(false), 3000);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(aiPromptText);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = aiPromptText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        processImportText(text);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteImport = () => {
    if (!pastedCSV.trim()) {
      setImportStatus('Please paste your CSV text before clicking import.');
      return;
    }
    processImportText(pastedCSV);
  };

  const processImportText = (text: string) => {
    const parsed = parseCSVToCustomers(text);
    if (parsed.length > 0) {
      onImportCustomers(parsed);
      setImportStatus(`Successfully imported ${parsed.length} customers!`);
      setPastedCSV('');
      setTimeout(() => {
        setImportStatus(null);
        onClose();
      }, 1500);
    } else {
      setImportStatus('No valid customers found in CSV. Please verify column headers: Name, Phone, Address, Price.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">Spreadsheet & Data Tools</h2>
              <p className="text-xs text-slate-500">Google Sheets, Excel & AI Notepad Importer</p>
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
          {/* AI Notepad Converter (Requested feature) */}
          <div className="bg-linear-to-br from-indigo-50/80 to-purple-50/80 border border-indigo-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-xs uppercase tracking-wider text-indigo-900">
                  AI Notepad Converter
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                ChatGPT / Claude
              </span>
            </div>

            <p className="text-xs text-indigo-950/80 leading-relaxed">
              Have your customers written in <strong>Apple Notes, WhatsApp, or a paper notepad</strong>? Copy this prompt, paste it into ChatGPT, Claude, or Gemini along with your rough notes, and it will generate an instant import!
            </p>

            {/* Prompt preview box */}
            <div className="bg-white/80 rounded-xl p-2.5 border border-indigo-100 text-[11px] font-mono text-slate-700 max-h-24 overflow-y-auto leading-tight select-all">
              {aiPromptText}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all"
              >
                {promptCopied ? (
                  <>
                    <ClipboardCheck className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Prompt Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy AI Prompt</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowPaster(!showPaster)}
                className="py-2.5 px-3 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-900 font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-all"
              >
                <span>{showPaster ? 'Hide Paste Box' : 'Paste AI Output'}</span>
              </button>
            </div>

            {/* Direct Paste Area */}
            {showPaster && (
              <div className="pt-2 space-y-2 border-t border-indigo-100 animate-in fade-in duration-150">
                <label className="text-[11px] font-bold text-indigo-900 block">
                  Paste CSV text from your AI here:
                </label>
                <textarea
                  rows={4}
                  value={pastedCSV}
                  onChange={(e) => setPastedCSV(e.target.value)}
                  placeholder="Name,Phone,Address,Price,FrequencyWeeks,NextDueDate,Notes&#10;John Smith,07700900111,14 High St,25,4,2026-09-24,Gate code 1234"
                  className="w-full text-xs font-mono p-2.5 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="button"
                  onClick={handlePasteImport}
                  className="w-full py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import Pasted Customers</span>
                </button>
              </div>
            )}
          </div>

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
              {downloadNotification ? (
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

          {/* Import CSV File */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-600 block">
              Import CSV File
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload any existing customer CSV file from your device files or cloud drive.
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
              <span>Choose CSV File to Upload</span>
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
