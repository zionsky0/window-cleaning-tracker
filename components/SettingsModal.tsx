'use client';

import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Database, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Smartphone, 
  Copy, 
  Check, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { SheetConnectionInfo } from '@/lib/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDemoMode: boolean;
  onDataReset: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  isDemoMode,
  onDataReset,
}: SettingsModalProps) {
  if (!isOpen) return null;

  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<SheetConnectionInfo | null>(null);
  const [resettingDemo, setResettingDemo] = useState(false);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await fetch('/api/test-connection');
      const data: SheetConnectionInfo = await res.json();
      setConnectionResult(data);
    } catch (err: any) {
      setConnectionResult({
        isConnected: false,
        isDemoMode: true,
        error: err.message || 'Failed to test connection',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleResetDemoData = async () => {
    if (!window.confirm('Reset demo customers back to initial seed data?')) return;
    setResettingDemo(true);
    try {
      await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_demo' }),
      });
      onDataReset();
      alert('Demo data successfully reset!');
    } catch (err: any) {
      alert('Failed to reset demo data');
    } finally {
      setResettingDemo(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedVar(label);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">Settings & Database</h2>
              <p className="text-xs text-slate-500">Google Sheets sync and app configuration</p>
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
        <div className="p-5 space-y-6 overflow-y-auto">
          {/* Current Status Card */}
          <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-500" />
                Connection Status
              </span>
              {isDemoMode ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  Demo / Local Mode
                </span>
              ) : (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Google Sheet Connected
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {isDemoMode
                ? 'The app is currently running in local Demo Mode. You can test all features (marking cleans done, sending "On my way" texts, adding customers). To sync with your real Google Sheet, follow the 3 steps below.'
                : 'Connected to your Google Sheet! All customer records, completed cleans, and next scheduled dates sync live.'}
            </p>

            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                <span>Test Live Connection</span>
              </button>

              {isDemoMode && (
                <button
                  onClick={handleResetDemoData}
                  disabled={resettingDemo}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Demo Data</span>
                </button>
              )}
            </div>

            {connectionResult && (
              <div
                className={`mt-3 p-3 rounded-xl text-xs ${
                  connectionResult.isConnected
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border border-amber-200'
                }`}
              >
                {connectionResult.isConnected ? (
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Connected! Found {connectionResult.rowCount} customers in your Sheet.</span>
                  </div>
                ) : (
                  <div>
                    <span className="font-bold block mb-1">
                      {connectionResult.isDemoMode
                        ? 'Running in Demo Mode (No environment credentials detected)'
                        : 'Connection Issue:'}
                    </span>
                    <span className="text-[11px] text-slate-700">
                      {connectionResult.error || 'Set your Google Service Account environment variables to connect.'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Setup Guide for Google Sheets */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-600" />
              How to Connect Your Google Sheet
            </h3>

            {/* Step 1 */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">Step 1: Create Your Google Sheet</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
                  Headers
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Create a new Google Sheet named <strong>Window Cleaning</strong> with a tab named <strong>Customers</strong> and these column headers in row 1:
              </p>
              <div className="bg-slate-100 rounded-lg p-2 text-[10px] font-mono text-slate-700 overflow-x-auto">
                ID, Name, Phone, Address, Price, FrequencyWeeks, LastCleanedDate, NextDueDate, Status, Notes, PreferredContact
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <span className="font-bold text-xs text-slate-900 block">
                Step 2: Share Sheet with Google Service Account
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                In Google Cloud Console, create a Service Account, generate a JSON Key, and share your Google Sheet with the Service Account email as an <strong>Editor</strong>.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
              <span className="font-bold text-xs text-slate-900 block">
                Step 3: Add Variables in Vercel or .env.local
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Add these 3 environment variables in your Vercel Project Settings:
              </p>
              
              <div className="space-y-1 font-mono text-xs">
                {[
                  'GOOGLE_SHEET_ID',
                  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
                  'GOOGLE_PRIVATE_KEY',
                ].map((varName) => (
                  <div
                    key={varName}
                    className="flex items-center justify-between bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg"
                  >
                    <span className="text-slate-800 text-[11px] font-bold">{varName}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(varName, varName)}
                      className="text-slate-400 hover:text-slate-700 p-1"
                    >
                      {copiedVar === varName ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Add to Home Screen Tips */}
          <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <div className="text-xs text-sky-900 leading-relaxed">
              <span className="font-bold block mb-0.5">Use as a Native App on Mobile:</span>
              On iPhone Safari, tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.
              On Android Chrome, tap the <strong>⋮ Menu</strong> → <strong>Install App / Add to Home screen</strong>.
              It will launch fullscreen like a mobile app!
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
