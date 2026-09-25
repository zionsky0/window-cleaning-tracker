'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  MapPin,
  Navigation,
  Check,
  Compass,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { NavApp, TravelMode } from '@/lib/types';
import {
  getLocalStartLocation,
  setLocalStartLocation,
  getLocalTravelMode,
  setLocalTravelMode,
  getLocalNavApp,
  setLocalNavApp,
  getLocalUser,
  setLocalUser,
} from '@/lib/storage';

interface BusinessProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
  onSaveBusinessName: (name: string) => void;
}

export function BusinessProfileModal({
  isOpen,
  onClose,
  businessName,
  onSaveBusinessName,
}: BusinessProfileModalProps) {
  const [name, setName] = useState(businessName || 'ClearView');
  const [cleanerName, setCleanerName] = useState('');
  const [depotAddress, setDepotAddress] = useState('');
  const [navApp, setNavApp] = useState<NavApp>('google');
  const [travelMode, setTravelMode] = useState<TravelMode>('walking');
  const [isLocating, setIsLocating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(businessName || 'ClearView');

    const user = getLocalUser();
    if (user?.cleanerName) setCleanerName(user.cleanerName);

    const startLoc = getLocalStartLocation();
    if (startLoc?.address) setDepotAddress(startLoc.address);

    setNavApp(getLocalNavApp());
    setTravelMode(getLocalTravelMode());
    setStatusMsg(null);
  }, [isOpen, businessName]);

  if (!isOpen) return null;

  // Use GPS to detect home/depot postcode
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setStatusMsg('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setStatusMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          // Reverse geocode to get street or postcode
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          if (res.ok) {
            const data = await res.json();
            const postcode = data?.address?.postcode || '';
            const road = data?.address?.road || '';
            const town = data?.address?.city || data?.address?.town || data?.address?.village || '';
            const label = [road, town, postcode].filter(Boolean).join(', ') || 'My GPS Base';

            setDepotAddress(label);
            setLocalStartLocation({ address: label, lat, lng });
          } else {
            setDepotAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            setLocalStartLocation({ address: 'My GPS Base', lat, lng });
          }
        } catch (e) {
          setDepotAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          setLocalStartLocation({ address: 'My GPS Base', lat, lng });
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setStatusMsg('Could not fetch GPS. You can type your postcode manually.');
      },
      { timeout: 7000 }
    );
  };

  const handleSave = () => {
    const trimmedName = name.trim() || 'ClearView';
    onSaveBusinessName(trimmedName);

    // Save cleaner profile locally
    const current = getLocalUser();
    setLocalUser({
      identifier: current?.identifier || 'local-cleaner',
      type: current?.type || 'phone',
      businessName: trimmedName,
      cleanerName: cleanerName.trim(),
      token: current?.token,
    });

    // Save depot base
    if (depotAddress.trim()) {
      const currentStart = getLocalStartLocation();
      setLocalStartLocation({
        address: depotAddress.trim(),
        lat: currentStart?.lat,
        lng: currentStart?.lng,
      });
    }

    // Save preferences
    setLocalTravelMode(travelMode);
    setLocalNavApp(navApp);

    confetti({ particleCount: 40, spread: 60 });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                Business & Base Setup
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customise your branding & starting depot
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-3.5 text-xs">
          {/* Business Name */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Business / Trade Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Window Cleaning"
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Cleaner First Name */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Your First Name (for SMS templates)
            </label>
            <input
              type="text"
              value={cleanerName}
              onChange={(e) => setCleanerName(e.target.value)}
              placeholder="e.g. Jack"
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Home/Depot Base Postcode */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Starting Home / Depot Base
              </label>
              <button
                type="button"
                onClick={handleUseGps}
                disabled={isLocating}
                className="text-[11px] text-brand-600 dark:text-brand-400 hover:text-brand-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Navigation className="w-3 h-3" />
                <span>{isLocating ? 'Locating...' : 'Use GPS'}</span>
              </button>
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={depotAddress}
                onChange={(e) => setDepotAddress(e.target.value)}
                placeholder="e.g. SK9 1AA or 12 High Street"
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Used as the starting and finishing point for smart route navigation.
            </span>
          </div>

          {/* Travel Mode */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Primary Round Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTravelMode('walking')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  travelMode === 'walking'
                    ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                🚶 Walking / Trolley
              </button>
              <button
                type="button"
                onClick={() => setTravelMode('driving')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  travelMode === 'driving'
                    ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                🚗 Van Driving
              </button>
            </div>
          </div>
        </div>

        {statusMsg && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">{statusMsg}</p>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}
