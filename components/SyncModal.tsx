'use client';

import React, { useState } from 'react';
import { X, Cloud, Phone, Mail, Lock, Check, LogOut, RefreshCw, AlertCircle } from 'lucide-react';
import { Customer } from '@/lib/types';
import { CleanerUser } from '@/lib/storage';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CleanerUser | null;
  onUserChange: (user: CleanerUser | null, syncedCustomers?: Customer[]) => void;
  customers: Customer[];
  businessName: string;
  onBusinessNameChange: (name: string) => void;
}

export function SyncModal({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  customers,
  businessName,
  onBusinessNameChange,
}: SyncModalProps) {
  const [tab, setTab] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cleanerName, setCleanerName] = useState(currentUser?.cleanerName || '');
  const [companyName, setCompanyName] = useState(businessName);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = tab === 'phone' ? phone.trim() : email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!identifier || !cleanPassword) {
      setMessage({ text: 'Please enter both your login details and password.', type: 'error' });
      return;
    }

    if (cleanPassword.length < 4) {
      setMessage({ text: 'Password should be at least 4 characters long.', type: 'error' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          identifier,
          pin: cleanPassword, // Kept field name compatible with backend
          businessName: companyName.trim() || 'ClearView',
          cleanerName: cleanerName.trim() || 'Cleaner',
          customers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync with cloud');
      }

      const updatedUser: CleanerUser = {
        identifier,
        type: tab,
        businessName: data.businessName || companyName,
        cleanerName: data.cleanerName || cleanerName,
        lastSyncedAt: data.lastSyncedAt || new Date().toISOString(),
      };

      onBusinessNameChange(updatedUser.businessName);
      onUserChange(updatedUser, data.customers);

      setMessage({
        text: data.mode === 'registered' ? 'Account created and rounds backed up!' : 'Cloud rounds synced successfully!',
        type: 'success',
      });

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setMessage({ text: err.message || 'Sync failed. Please check your details.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    onUserChange(null);
    setMessage({ text: 'Logged out. Your data is still safely saved locally.', type: 'success' });
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-brand-600 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">Cloud Sync & Backup</h2>
              <p className="text-xs text-slate-500">Access your rounds on any phone, tablet, or PC</p>
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
          {currentUser ? (
            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-sky-800">
                  Connected Account
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Active Cloud Sync
                </span>
              </div>
              <div className="text-xs text-slate-700 space-y-1">
                <p><strong>Account:</strong> {currentUser.identifier}</p>
                <p><strong>Round Name:</strong> {currentUser.businessName}</p>
                {currentUser.lastSyncedAt && (
                  <p className="text-slate-500 text-[11px]">
                    Last backed up: {new Date(currentUser.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex-1 py-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out (Keep Local Data)</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSync} className="space-y-4">
              {/* Login Method Tabs */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTab('phone')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    tab === 'phone'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Mobile Number
                </button>
                <button
                  type="button"
                  onClick={() => setTab('email')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    tab === 'email'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Email Address
                </button>
              </div>

              {tab === 'phone' ? (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Mobile Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 07700 900123"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. dave@apexcleaning.co.uk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Account Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Choose any secure password. If this is your first time, this creates your account. If returning, this logs you back in.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Company / Round Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Your First Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jake"
                    value={cleanerName}
                    onChange={(e) => setCleanerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              {message && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    message.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-red-50 text-red-900 border border-red-200'
                  }`}
                >
                  {message.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Cloud className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Connecting...' : 'Backup & Sync Rounds'}</span>
              </button>
            </form>
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
