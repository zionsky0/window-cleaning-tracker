'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Compass,
  Calendar,
  Sparkles,
  MapPin,
  Check,
  RotateCcw,
  ArrowRight,
  Layers,
  ChevronDown,
  ChevronUp,
  Building2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Customer } from '@/lib/types';
import { getTodayDateString } from '@/lib/dateUtils';
import { clusterCustomersByProximity, DayCluster, CLUSTER_COLORS } from '@/lib/clusterPlanner';

interface SmartAreaPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onApplySchedule: (updatedCustomers: Customer[]) => void;
}

export function SmartAreaPlannerModal({
  isOpen,
  onClose,
  customers,
  onApplySchedule,
}: SmartAreaPlannerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  const todayStr = getTodayDateString();

  // Next upcoming Monday date by default
  const defaultStartDate = useMemo(() => {
    const [y, m, d] = todayStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayOfWeek = date.getDay();
    // Days until next Monday: 1 = Mon (if today is Mon, next Mon is +7 days, otherwise distance to next Mon)
    const distanceToNextMonday = dayOfWeek === 1 ? 7 : (1 + 7 - dayOfWeek) % 7;
    date.setDate(date.getDate() + distanceToNextMonday);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [todayStr]);

  const [numberOfDays, setNumberOfDays] = useState<number>(() => {
    const activeCount = customers.filter((c) => c.status !== 'paused').length;
    if (activeCount <= 12) return 2;
    if (activeCount <= 24) return 3;
    if (activeCount <= 40) return 4;
    return 5;
  });

  const [startDateString, setStartDateString] = useState<string>(defaultStartDate);
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const [isApplying, setIsApplying] = useState(false);

  // Compute the geographic clusters
  const clusters = useMemo(() => {
    if (!isOpen) return [];
    return clusterCustomersByProximity(customers, {
      numberOfDays,
      startDateString,
      skipWeekends,
    });
  }, [isOpen, customers, numberOfDays, startDateString, skipWeekends]);

  // Leaflet map initialization & rendering
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    let isMounted = true;

    async function initMap() {
      try {
        if (!(window as any).L) {
          if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
          }

          await new Promise((resolve) => {
            if (document.getElementById('leaflet-js')) {
              resolve(true);
              return;
            }
            const script = document.createElement('script');
            script.id = 'leaflet-js';
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => resolve(true);
            document.head.appendChild(script);
          });
        }

        const L = (window as any).L;
        if (!L || !isMounted || !mapContainerRef.current) return;

        // Cleanup previous instance
        if (leafletMapRef.current) {
          try {
            leafletMapRef.current.remove();
          } catch {}
          leafletMapRef.current = null;
        }

        // Find initial center from all customers
        const coordsList: [number, number][] = [];
        clusters.forEach((cl) => {
          cl.customers.forEach((c) => {
            if (c.lat && c.lng && c.lat !== 0 && c.lng !== 0) {
              coordsList.push([c.lat, c.lng]);
            }
          });
        });

        const initialCenter: [number, number] =
          coordsList.length > 0 ? coordsList[0] : [53.4808, -2.2426];

        const map = L.map(mapContainerRef.current, {
          center: initialCenter,
          zoom: 13,
          zoomControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        L.control.zoom({ position: 'topright' }).addTo(map);

        leafletMapRef.current = map;

        // Add pins for each cluster with cluster color
        const bounds = L.latLngBounds([]);

        clusters.forEach((cluster, clIdx) => {
          cluster.customers.forEach((cust, idx) => {
            if (!cust.lat || !cust.lng) return;

            const latLng: [number, number] = [cust.lat, cust.lng];
            bounds.extend(latLng);

            const pinHtml = `
              <div style="
                background-color: ${cluster.color};
                color: white;
                width: 26px;
                height: 26px;
                border-radius: 9999px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 900;
                font-size: 11px;
                border: 2px solid white;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
              ">
                D${clIdx + 1}
              </div>
            `;

            const icon = L.divIcon({
              html: pinHtml,
              className: 'custom-cluster-pin',
              iconSize: [26, 26],
              iconAnchor: [13, 13],
            });

            const marker = L.marker(latLng, { icon }).addTo(map);
            marker.bindPopup(`
              <div style="font-family: inherit; padding: 4px 2px;">
                <div style="font-weight: 800; font-size: 13px; color: #0f172a;">${cust.name}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${cust.address}</div>
                <div style="margin-top: 6px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                  <span style="font-weight: 900; font-size: 12px; color: #0f172a;">£${cust.price}</span>
                  <span style="
                    background: ${cluster.color};
                    color: white;
                    font-size: 10px;
                    font-weight: 800;
                    padding: 2px 6px;
                    border-radius: 6px;
                  ">
                    Day ${clIdx + 1} (${cluster.dayName.split(' ')[0]})
                  </span>
                </div>
              </div>
            `);
          });
        });

        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30] });
        }
      } catch (err) {
        console.error('Failed to initialize clustering map:', err);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isOpen, clusters]);

  if (!isOpen) return null;

  // Handle Apply Schedule
  const handleApply = () => {
    setIsApplying(true);

    try {
      // Map customer ID -> assigned nextDueDate
      const dueDateMap = new Map<string, string>();
      clusters.forEach((cluster) => {
        cluster.customers.forEach((c) => {
          dueDateMap.set(c.id, cluster.dateString);
        });
      });

      const updated = customers.map((c) => {
        if (dueDateMap.has(c.id)) {
          return { ...c, nextDueDate: dueDateMap.get(c.id)! };
        }
        return c;
      });

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: CLUSTER_COLORS,
      });

      onApplySchedule(updated);
      onClose();
    } catch (err) {
      console.error('Failed to apply proximity schedule:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const totalActive = clusters.reduce((sum, cl) => sum + cl.customers.length, 0);
  const totalRevenue = clusters.reduce((sum, cl) => sum + cl.totalPrice, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 transition-colors duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base text-slate-900 dark:text-white leading-tight">
                Smart Area & Proximity Auto-Planner
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Clean 1 compact neighborhood each day with zero zig-zagging
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
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Controls Bar: Days & Start Date */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Working Days Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Split Round Across:
                </label>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  {[2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setNumberOfDays(num)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        numberOfDays === num
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {num} Days
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Date Picker */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Starting Cycle Date:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={startDateString}
                    onChange={(e) => setStartDateString(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Skip weekends checkbox */}
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
              <input
                type="checkbox"
                id="skipWeekends"
                checked={skipWeekends}
                onChange={(e) => setSkipWeekends(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
              <label htmlFor="skipWeekends" className="cursor-pointer font-medium">
                Skip weekends (schedule workdays Monday to Friday only)
              </label>
            </div>
          </div>

          {/* Interactive Map of Geographic Clusters */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner h-56 sm:h-64 bg-slate-100 dark:bg-slate-950">
            <div ref={mapContainerRef} className="w-full h-full" />
            <div className="absolute top-2.5 left-2.5 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-xl text-[11px] font-black border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-xs">
              🗺️ Color-Coded Neighborhood Clusters
            </div>
          </div>

          {/* Clusters Breakdown List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold uppercase text-slate-400">
                Scheduled Daily Clusters ({clusters.length} Days)
              </span>
              <span className="font-extrabold text-slate-700 dark:text-slate-300">
                Total: {totalActive} cleans • £{totalRevenue}
              </span>
            </div>

            <div className="space-y-2">
              {clusters.map((cluster, clIdx) => {
                const isExpanded = expandedDay === clIdx;

                return (
                  <div
                    key={cluster.dayIndex}
                    className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedDay(isExpanded ? null : clIdx)}
                      className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Day number badge */}
                        <div
                          style={{ backgroundColor: cluster.color }}
                          className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs"
                        >
                          D{clIdx + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                              Day {clIdx + 1}: {cluster.dayName}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                              {cluster.customers.length} houses
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            📍 {cluster.clusterName} ({cluster.radiusMiles} mi radius)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                          £{cluster.totalPrice}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded customer list for this cluster */}
                    {isExpanded && (
                      <div className="p-3 pt-0 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/40 dark:bg-slate-900/40 space-y-1.5 max-h-48 overflow-y-auto">
                        {cluster.customers.map((c, stopNum) => (
                          <div
                            key={c.id}
                            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {stopNum + 1}
                              </span>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 dark:text-white block truncate">
                                  {c.name}
                                </span>
                                <span className="text-[11px] text-slate-400 block truncate">
                                  {c.address}
                                </span>
                              </div>
                            </div>
                            <span className="font-black text-slate-800 dark:text-slate-200 shrink-0 ml-2">
                              £{c.price}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
            onClick={handleApply}
            disabled={isApplying || clusters.length === 0}
            className="flex-1 py-2.5 px-4 bg-linear-to-r from-brand-600 via-indigo-600 to-brand-600 hover:from-brand-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <Sparkles className="w-4 h-4" />
            <span>Apply Proximity Schedule ({clusters.length} Days)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
