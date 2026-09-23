'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Building2, 
  Database, 
  Check, 
  Copy, 
  ExternalLink, 
  Upload, 
  Download, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';
import { UserProfile, Customer } from '@/lib/types';
import { customersToCSV, downloadCSV, parseCSVToCustomers } from '@/lib/csvUtils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  customers: Customer[];
  onImportCustomers: (newCustomers: Omit<Customer, 'id'>[]) => void;
}

export function ProfileModal({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  customers,
  onImportCustomers,
}: ProfileModalProps) {
  if (!isOpen) return null;

  const [businessName, setBusinessName] = useState(profile.businessName || 'ClearView');
  const [cleanerName, setCleanerName] = useState(profile.cleanerName || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [sheetUrl, setSheetUrl] = useState(profile.sheetUrl || profile.sheetId || '');
  const [serviceAccountEmail, setServiceAccountEmail] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ isConnected: boolean; message: string } | null>(null);

  // Fetch service account email from test-connection endpoint
  useEffect(() => {
    fetch('/api/test-connection')
      .then((res) => res.json())
      .then((data) => {
        if (data.serviceAccount) {
          setServiceAccountEmail(data.serviceAccount);
        }
      })
      .catch(() => {});
  }, []);

  // Helper to extract Sheet ID from full Google Sheet URL
  const extractSheetId = (input: string): string => {
    const trimmed = input.trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return trimmed;
  };

  const handleCopyEmail = () => {
    if (!serviceAccountEmail) return;
    navigator.clipboard.writeText(serviceAccountEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleTestConnection = async () => {
    const extractedId = extractSheetId(sheetUrl);
    if (!extractedId) {
      setTestResult({
        isConnected: false,
        message: 'Please paste your Google Sheet URL or ID first.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(`/api/test-connection?sheetId=${encodeURIComponent(extractedId)}`, {
        headers: { 'x-sheet-id': extractedId },
      });
      const data = await res.json();

      if (data.isConnected) {
        setTestResult({
          isConnected: true,
          message: `Connected successfully! Found ${data.rowCount} customer rows in your Sheet.`,
        });
      } else {
        setTestResult({
          isConnected: false,
          message: data.error || 'Could not access sheet. Make sure you shared it as Editor with the Service Account email.',
        });
      }
    } catch (err: any) {
      setTestResult({
        isConnected: false,
        message: err.message || 'Connection failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const extractedId = extractSheetId(sheetUrl);
    const updated: UserProfile = {
      ...profile,
      businessName: businessName.trim() || 'ClearView',
      cleanerName: cleanerName.trim(),
      phone: phone.trim(),
      sheetUrl: sheetUrl.trim(),
      sheetId: extractedId,
    };
    onSaveProfile(updated);
    onClose();
  };

  const handleExportCSV = () => {
    const csvData = customersToCSV(customers);
    const safeName = (businessName || 'window-cleaner').toLowerCase().replace(/\s+/g, '-');
    downloadCSV(csvData, `${safeName}-customers-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseCSVToCustomers(text);
        if (parsed.length > 0) {
          if (window.confirm(`Found ${parsed.length} customers in your CSV file. Import them now?`)) {
            onImportCustomers(parsed);
            onClose();
          }
        } else {
          alert('Could not find customer rows in the CSV file. Please make sure it has headers: Name, Phone, Address, Price...');
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
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">Your Cleaner Profile</h2>
              <p className="text-xs text-slate-500">Business info & your personal Google Sheet</p>
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
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Business Details */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Business Info
            </h3>
            
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Company / Round Name
              </label>
              <input
                type="text"
                placeholder="e.g. Apex Window Cleaning"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dave"
                  value={cleanerName}
                  onChange={(e) => setCleanerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Your Phone
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 07700 900123"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Connect Your Own Google Sheet */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                Connect Your Google Sheet
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Multi-User
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Connect your own spreadsheet to keep all your customer records safe and private in your personal Google Drive.
            </p>

            {/* Quick 2-Step Connection */}
            <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-3.5 space-y-3">
              <div className="text-xs text-sky-950 font-medium space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-200 text-sky-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <div>
                    <span>Create a copy of the template in your Google Drive:</span>
                    <a
                      href="https://docs.google.com/spreadsheets/d/1Xl2qV4qgKkQxP08Zq_V9eQ1q4z_template/copy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 bg-white border border-sky-200 px-2.5 py-1 rounded-lg shadow-2xs"
                    >
                      <span>Make a Copy of Template Sheet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {serviceAccountEmail && (
                  <div className="flex items-start gap-2 pt-1 border-t border-sky-100">
                    <span className="w-5 h-5 rounded-full bg-sky-200 text-sky-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <div className="flex-1 min-w-0">
                      <span>Click <strong>Share</strong> on your Sheet and add this service email as <strong>Editor</strong>:</span>
                      <div className="mt-1 flex items-center justify-between bg-white border border-sky-200 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-700">
                        <span className="truncate mr-2">{serviceAccountEmail}</span>
                        <button
                          type="button"
                          onClick={handleCopyEmail}
                          className="shrink-0 text-brand-600 hover:text-brand-800 font-sans font-bold flex items-center gap-1 text-[11px]"
                        >
                          {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Paste Sheet URL */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Your Google Sheet Link or ID
              </label>
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/1a2b3c.../edit"
                value={sheetUrl}
                onChange={(e) => {
                  setSheetUrl(e.target.value);
                  setTestResult(null);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
              />
            </div>

            {/* Test Connection Button */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !sheetUrl.trim()}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 disabled:text-slate-400 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Testing connection...' : 'Test Sheet Connection'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  testResult.isConnected
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-red-50 text-red-900 border border-red-200'
                }`}
              >
                {testResult.isConnected ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Backup & Import Tools */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Data Backup & Import
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV ({customers.length})</span>
              </button>

              <label className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Import CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-2.5 border border-slate-200 rounded-xl font-semibold text-xs text-slate-600 hover:bg-slate-100 transition-all"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-600/20 flex items-center justify-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save Profile & Sheet</span>
          </button>
        </div>
      </div>
    </div>
  );
}
