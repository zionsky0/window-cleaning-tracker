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
  Building2,
  Clock,
  Repeat,
  Info,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Customer } from '@/lib/types';
import { getTodayDateString } from '@/lib/dateUtils';
import {
  clusterCustomersByProximity,
  getFrequencySummary,
  DayCluster,
  CLUSTER_COLORS,
  PlannerMode,
  FrequencyGrouping
} from '@/lib/clusterPlanner';

interface SmartAreaPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onApplySchedule: (updatedCustomers: Customer[]) => void;
}

export function SmartAreaPlannerModal({
  isOpen,
  onClose,
  customers = [],
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

  // Frequency summary
  const freqSummary = useMemo(() => getFrequencySummary(customers), [customers]);

  // Planner Mode: 4-week cycle is standard for UK window cleaning
  const [plannerMode, setPlannerMode] = useState<PlannerMode>('4week_cycle');
  const [frequencyGrouping, setFrequencyGrouping] = useState<FrequencyGrouping>('harmonized');
  const [frequencyFilter, setFrequencyFilter] = useState<number | 'all'>('all');

  // Number of rounds / days
  const [numberOfDays, setNumberOfDays] = useState<number>(4);
  const [startDateString, setStartDateString] = useState<string>(defaultStartDate);
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const [selectedRoundTab, setSelectedRoundTab] = useState<number | 'all'>('all');
  const [isApplying, setIsApplying] = useState(false);

  // Compute the geographic clusters
  const clusters = useMemo(() => {
    if (!isOpen) return [];
    return clusterCustomersByProximity(customers, {
      plannerMode,
      numberOfDays,
      startDateString,
      skipWeekends,
      frequencyGrouping,
      frequencyFilter,
    });
  }, [
    isOpen,
    customers,
    plannerMode,
    numberOfDays,
    startDateString,
    skipWeekends,
    frequencyGrouping,
    frequencyFilter,
  ]);

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
          // If a round tab is active, filter pins
          if (selectedRoundTab !== 'all' && selectedRoundTab !== clIdx) {
            return;
          }

          const badgeLabel =
            plannerMode === '4week_cycle' ? `W${cluster.weekNumber}` : `D${clIdx + 1}`;

          cluster.customers.forEach((cust) => {
            if (!cust.lat || !cust.lng) return;

            const latLng: [number, number] = [cust.lat, cust.lng];
            bounds.extend(latLng);

            const pinHtml = `
              <div style="
                background-color: ${cluster.color};
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 9999px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 900;
                font-size: 11px;
                border: 2px solid white;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.35);
              ">
                ${badgeLabel}
              </div>
            `;

            const icon = L.divIcon({
              html: pinHtml,
              className: 'custom-cluster-pin',
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            });

            const marker = L.marker(latLng, { icon }).addTo(map);
            marker.bindPopup(`
              <div style="font-family: inherit; padding: 4px 2px; min-width: 150px;">
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
                    ${cluster.roundLabel} • Every ${cust.frequencyWeeks || 4}w
                  </span>
                </div>
              </div>
            `);
          });
        });

        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [35, 35] });
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
  }, [isOpen, clusters, plannerMode, selectedRoundTab]);

  if (!isOpen) return null;

  // Handle Apply Schedule
  const handleApply = () => {
    setIsApplying(true);

    try {
      // Map customer ID -> assigned starting nextDueDate
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
        particleCount: 75,
        spread: 75,
        origin: { y: 0.6 },
        colors: CLUSTER_COLORS,
      });

      onApplySchedule(updated);
      onClose();
    } catch (err) {
      console.error('Failed to apply schedule:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const totalActive = clusters.reduce((sum, cl) => sum + cl.customers.length, 0);
  const totalRevenue = clusters.reduce((sum, cl) => sum + cl.totalPrice, 0);

  // Filtered clusters for the view
  const visibleClusters =
    selectedRoundTab === 'all'
      ? clusters
      : clusters.filter((_, idx) => idx === selectedRoundTab);

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
                Smart Frequency & Area Round Planner
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Organize 2-week, 4-week, and 8-week cleans into balanced neighborhood rounds
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
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          {/* Frequency Breakdown Metric Strip */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3 flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              <span className="font-extrabold text-slate-700 dark:text-slate-200">
                Customer Cadence:
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-extrabold text-[11px]">
                2-Weekly: {freqSummary.freq2w}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold text-[11px]">
                4-Weekly: {freqSummary.freq4w}
              </span>
              {freqSummary.freq8w > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-[11px]">
                  8-Weekly: {freqSummary.freq8w}
                </span>
              )}
              <span className="text-slate-400 font-semibold text-[11px] ml-1">
                ({freqSummary.totalActive} active total)
              </span>
            </div>
          </div>

          {/* Planning Mode & Configuration Card */}
          <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Mode Toggle */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Planning Cycle:
                </label>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setPlannerMode('4week_cycle');
                      setNumberOfDays(4);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      plannerMode === '4week_cycle'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    4-Week Round Cycle
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPlannerMode('daily_split');
                      setNumberOfDays(3);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      plannerMode === 'daily_split'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Single Week Split
                  </button>
                </div>
              </div>

              {/* Number of Rounds / Days */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {plannerMode === '4week_cycle' ? 'Rounds in Cycle:' : 'Split Across:'}
                </label>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  {plannerMode === '4week_cycle'
                    ? [2, 3, 4, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setNumberOfDays(num)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            numberOfDays === num
                              ? 'bg-brand-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {num} {num === 4 ? 'Wks' : 'Rounds'}
                        </button>
                      ))
                    : [2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setNumberOfDays(num)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
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
            </div>

            {/* Date and Frequency Options */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              {/* Start Date */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Cycle Start:
                </span>
                <input
                  type="date"
                  value={startDateString}
                  onChange={(e) => setStartDateString(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              {/* Frequency Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-500 dark:text-slate-400">Target:</span>
                <select
                  value={frequencyFilter}
                  onChange={(e) =>
                    setFrequencyFilter(
                      e.target.value === 'all' ? 'all' : Number(e.target.value)
                    )
                  }
                  className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-2 py-1 text-xs font-bold focus:outline-none"
                >
                  <option value="all">All Frequencies (Balanced)</option>
                  <option value="4">4-Weekly Only</option>
                  <option value="2">2-Weekly Only</option>
                  <option value="8">8-Weekly Only</option>
                </select>
              </div>
            </div>

            {/* Smart Harmonization Explainer */}
            {plannerMode === '4week_cycle' && (
              <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/40 rounded-xl p-2.5 flex items-start gap-2 text-xs">
                <Repeat className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <p className="text-sky-900 dark:text-sky-300 text-[11px] leading-snug">
                  <strong>Frequency Harmony Enabled:</strong> 4-weekly houses form your core area
                  rounds. 2-weekly cleans are paired with their local neighbors in Week 1 or Week 2
                  and automatically repeat 2 weeks later.
                </p>
              </div>
            )}
          </div>

          {/* Interactive Map of Geographic Clusters */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner h-52 sm:h-60 bg-slate-100 dark:bg-slate-950">
            <div ref={mapContainerRef} className="w-full h-full" />
            <div className="absolute top-2.5 left-2.5 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-2.5 py-1 rounded-xl text-[11px] font-black border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-xs flex items-center gap-1.5">
              <span>🗺️</span>
              <span>
                {plannerMode === '4week_cycle'
                  ? 'Multi-Week Round Clusters'
                  : 'Daily Geographic Clusters'}
              </span>
            </div>
          </div>

          {/* Round Selector Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedRoundTab('all')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs shrink-0 cursor-pointer transition-all ${
                selectedRoundTab === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              All Rounds ({clusters.length})
            </button>

            {clusters.map((cl, idx) => (
              <button
                key={cl.dayIndex}
                type="button"
                onClick={() => setSelectedRoundTab(idx)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 cursor-pointer transition-all ${
                  selectedRoundTab === idx
                    ? 'text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
                style={selectedRoundTab === idx ? { backgroundColor: cl.color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: selectedRoundTab === idx ? 'white' : cl.color }}
                />
                <span>{cl.roundLabel}</span>
                <span className="text-[10px] opacity-80">({cl.customers.length})</span>
              </button>
            ))}
          </div>

          {/* Clusters Breakdown List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-extrabold uppercase text-slate-400">
                {plannerMode === '4week_cycle'
                  ? `Cycle Schedule (${clusters.length} Rounds)`
                  : `Daily Rounds (${clusters.length} Days)`}
              </span>
              <span className="font-black text-slate-800 dark:text-slate-200">
                Total: {totalActive} cleans • £{totalRevenue}
              </span>
            </div>

            <div className="space-y-2">
              {visibleClusters.map((cluster) => {
                const isExpanded = expandedDay === cluster.dayIndex;

                return (
                  <div
                    key={cluster.dayIndex}
                    className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedDay(isExpanded ? null : cluster.dayIndex)}
                      className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Round badge */}
                        <div
                          style={{ backgroundColor: cluster.color }}
                          className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs"
                        >
                          {plannerMode === '4week_cycle'
                            ? `W${cluster.weekNumber}`
                            : `D${cluster.dayIndex + 1}`}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                              {cluster.roundLabel}: {cluster.dayName}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {cluster.customers.length} houses
                            </span>

                            {/* Frequency breakdown pill */}
                            {cluster.frequencyCounts.twoWeekly > 0 && (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                                {cluster.frequencyCounts.twoWeekly} bi-weekly
                              </span>
                            )}
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

                    {/* Expanded customer list for this round */}
                    {isExpanded && (
                      <div className="p-3 pt-0 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/40 dark:bg-slate-900/40 space-y-1.5 max-h-52 overflow-y-auto">
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
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 dark:text-white truncate">
                                    {c.name}
                                  </span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                                    Every {c.frequencyWeeks || 4}w
                                  </span>
                                </div>
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
            <span>
              Apply {plannerMode === '4week_cycle' ? '4-Week Cycle' : 'Proximity'} Schedule (
              {clusters.length} Rounds)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
