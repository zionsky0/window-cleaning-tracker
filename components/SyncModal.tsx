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
        token: cleanPassword,
        lastSyncedAt: data.lastSyncedAt || new Date().toISOString(),
      };

      onBusinessNameChange(updatedUser.businessName);

      // If server returned customers, pass them. If server had 0 but client has local customers, keep client's!
      const targetCustomers =
        Array.isArray(data.customers) && data.customers.length > 0
          ? data.customers
          : customers;

      onUserChange(updatedUser, targetCustomers);

      setMessage({
        text:
          data.mode === 'registered'
            ? 'Account created and rounds backed up!'
            : `Synced! Loaded ${targetCustomers.length} contacts.`,
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

  const handlePushToCloud = async () => {
    const activePass = currentUser?.token || password.trim();
    if (!activePass) {
      setMessage({ text: 'Please enter your password to backup to the cloud.', type: 'error' });
      return;
    }
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'push',
          identifier: currentUser?.identifier,
          pin: activePass,
          businessName,
          customers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to backup');

      const updatedUser: CleanerUser = {
        ...currentUser!,
        token: activePass,
        lastSyncedAt: data.lastSyncedAt || new Date().toISOString(),
      };
      onUserChange(updatedUser, customers);
      setMessage({ text: `Backed up ${customers.length} contacts to cloud!`, type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Backup failed', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePullFromCloud = async () => {
    const activePass = currentUser?.token || password.trim();
    if (!activePass) {
      setMessage({ text: 'Please enter your password to download from cloud.', type: 'error' });
      return;
    }
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pull',
          identifier: currentUser?.identifier,
          pin: activePass,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to download from cloud');

      const updatedUser: CleanerUser = {
        ...currentUser!,
        token: activePass,
        lastSyncedAt: data.lastSyncedAt || new Date().toISOString(),
      };
      if (Array.isArray(data.customers)) {
        onUserChange(updatedUser, data.customers);
        setMessage({ text: `Downloaded ${data.customers.length} contacts from cloud!`, type: 'success' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Download failed', type: 'error' });
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
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 transition-colors duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">Cloud Sync & Backup</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Access your rounds on any phone, tablet, or PC</p>
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
          {currentUser ? (
            <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-800/60 rounded-2xl p-4 space-y-3.5 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-sky-800 dark:text-sky-300">
                  Connected Account
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Active Cloud Sync
                </span>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 border border-sky-100 dark:border-sky-800/60 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-300 space-y-1.5 transition-colors">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Account:</span>
                  <span className="font-bold">{currentUser.identifier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Round Name:</span>
                  <span className="font-bold">{currentUser.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Device Contacts:</span>
                  <span className="font-bold text-brand-600 dark:text-brand-400">{customers.length} contacts</span>
                </div>
                {currentUser.lastSyncedAt && (
                  <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700">
                    <span>Last Backed Up:</span>
                    <span>
                      {new Date(currentUser.lastSyncedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Password prompt if token missing from storage */}
              {!currentUser.token && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Account Password (to sync)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                  />
                </div>
              )}

              {/* Sync Actions */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handlePushToCloud}
                  disabled={isLoading}
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Backup This Device to Cloud ({customers.length} contacts)</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullFromCloud}
                  disabled={isLoading}
                  className="w-full py-2.5 bg-sky-100 dark:bg-sky-950/60 hover:bg-sky-200 dark:hover:bg-sky-900/60 disabled:opacity-50 text-brand-700 dark:text-brand-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Download / Refresh from Cloud</span>
                </button>
              </div>

              <div className="pt-2 border-t border-sky-100 dark:border-sky-900/40">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out (Keep Local Data)</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSync} className="space-y-4">
              {/* Login Method Tabs */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors">
                <button
                  type="button"
                  onClick={() => setTab('phone')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    tab === 'phone'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Mobile Number
                </button>
                <button
                  type="button"
                  onClick={() => setTab('email')}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    tab === 'email'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Email Address
                </button>
              </div>

              {tab === 'phone' ? (
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    Mobile Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 07700 900123"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. dave@apexcleaning.co.uk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  Account Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Choose any secure password. If this is your first time, this creates your account. If returning, this logs you back in.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Company / Round Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Your First Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jake"
                    value={cleanerName}
                    onChange={(e) => setCleanerName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              {message && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    message.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-200 dark:border-red-800'
                  }`}
                >
                  {message.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 text-white font-bold text-sm rounded-xl shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
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
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex justify-end transition-colors">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
