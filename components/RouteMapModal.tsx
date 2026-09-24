'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Compass,
  ArrowUp,
  ArrowDown,
  Sparkles,
  RefreshCw,
  Home,
  Check,
  Play,
  Share2,
  Calendar,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { Customer, NavApp, RouteStop } from '@/lib/types';
import {
  optimizeTradeRoute,
  getSingleStopNavUrl,
  getMultiStopGoogleMapsUrl,
  GeoLocation,
} from '@/lib/routeOptimizer';
import {
  getLocalStartLocation,
  setLocalStartLocation,
  getLocalNavApp,
} from '@/lib/storage';

type RouteScope = 'today' | 'week' | 'all';

interface RouteMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  todayCustomers: Customer[];
  weekCustomers: Customer[];
  allCustomers: Customer[];
  onApplyRouteOrder: (orderedCustomers: Customer[]) => void;
  onStartRouteRunner: (orderedCustomers: Customer[]) => void;
  onMarkComplete?: (customer: Customer) => void;
}

export function RouteMapModal({
  isOpen,
  onClose,
  todayCustomers,
  weekCustomers,
  allCustomers,
  onApplyRouteOrder,
  onStartRouteRunner,
  onMarkComplete,
}: RouteMapModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  // Active round selection scope (Today, Week, All)
  const [scope, setScope] = useState<RouteScope>('today');
  const [isLoading, setIsLoading] = useState(false);
  const [orderedStops, setOrderedStops] = useState<RouteStop[]>([]);
  const [totalMiles, setTotalMiles] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [usedRoadNetwork, setUsedRoadNetwork] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | undefined>(undefined);

  // Start Location state
  const [startAddress, setStartAddress] = useState('');
  const [startCoords, setStartCoords] = useState<GeoLocation | undefined>(undefined);
  const [selectedNavApp, setSelectedNavApp] = useState<NavApp>('google');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Determine active customer pool based on selected scope
  const activeCustomers =
    scope === 'today'
      ? todayCustomers
      : scope === 'week'
      ? weekCustomers
      : allCustomers;

  // On initial open: pick best initial scope so cleaner NEVER sees an empty screen
  useEffect(() => {
    if (!isOpen) return;

    if (todayCustomers.length > 0) {
      setScope('today');
    } else if (weekCustomers.length > 0) {
      setScope('week');
    } else {
      setScope('all');
    }

    const savedLoc = getLocalStartLocation();
    if (savedLoc) {
      setStartAddress(savedLoc.address);
      if (savedLoc.lat && savedLoc.lng) {
        setStartCoords({ lat: savedLoc.lat, lng: savedLoc.lng, address: savedLoc.address });
      }
    }
    setSelectedNavApp(getLocalNavApp());
  }, [isOpen, todayCustomers.length, weekCustomers.length]);

  // Run Route Optimization for the active pool
  const runOptimization = async (targets: Customer[], overrideStart?: GeoLocation) => {
    if (!targets || targets.length === 0) {
      setOrderedStops([]);
      setTotalMiles(0);
      setTotalMinutes(0);
      setRouteGeometry(undefined);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setStatusNotice(null);

    const activeStart = overrideStart || startCoords;

    try {
      const result = await optimizeTradeRoute(targets, activeStart);
      setOrderedStops(result.routeStops);
      setTotalMiles(result.totalDistanceMiles);
      setTotalMinutes(result.totalDurationMinutes);
      setUsedRoadNetwork(result.usedRoadNetwork);
      setRouteGeometry(result.routeGeometry);
    } catch (e: any) {
      console.error('Route optimization error:', e);
      setStatusNotice('Route organized in street sequence.');
    } finally {
      setIsLoading(false);
    }
  };

  // Re-run optimization when scope or customer pool changes
  useEffect(() => {
    if (isOpen) {
      runOptimization(activeCustomers);
    }
  }, [isOpen, scope, activeCustomers.length]);

  // Handle GPS start location
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setStatusNotice('Geolocation is not supported by your browser.');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: GeoLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: 'Current Location',
        };
        setStartCoords(coords);
        setStartAddress('My Current GPS Location');
        setLocalStartLocation(coords);
        runOptimization(activeCustomers, coords);
      },
      () => {
        setIsLoading(false);
        setStatusNotice('Could not retrieve GPS location. You can type a postcode instead.');
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  };

  // Save manual depot address
  const handleSaveStartAddress = (val: string) => {
    setStartAddress(val);
    const loc = { address: val };
    setLocalStartLocation(loc);
    setStartCoords(undefined);
  };

  // Move Stop Up / Down manually
  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedStops.length) return;

    const copy = [...orderedStops];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const renumbered = copy.map((stop, i) => ({
      ...stop,
      stopIndex: i + 1,
    }));

    setOrderedStops(renumbered);
  };

  // Leaflet Map Lifecycle & Tile Rendering
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    let isMounted = true;

    const loadAndRenderMap = async () => {
      // 1. Ensure Leaflet CSS & JS are loaded dynamically
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

      if (!isMounted || !mapContainerRef.current) return;
      const L = (window as any).L;
      if (!L) return;

      // 2. Tear down existing map instance cleanly
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch {}
        leafletMapRef.current = null;
      }

      // 3. Initialize Map with UK centroid default
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([52.5, -1.8], 6);

      leafletMapRef.current = map;

      // 4. Add OpenStreetMap Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Force recalculation of map container size after modal animation
      setTimeout(() => {
        if (map && isMounted) {
          try {
            map.invalidateSize();
          } catch {}
        }
      }, 250);

      // 5. Plot valid points and road route
      const validPoints: [number, number][] = [];
      const markersData: Array<{ lat: number; lng: number; label: string; customer: Customer }> = [];

      orderedStops.forEach((stop) => {
        if (stop.customer.lat && stop.customer.lng) {
          validPoints.push([stop.customer.lat, stop.customer.lng]);
          markersData.push({
            lat: stop.customer.lat,
            lng: stop.customer.lng,
            label: String(stop.stopIndex),
            customer: stop.customer,
          });
        }
      });

      if (validPoints.length > 0) {
        // Draw Polyline (road route or straight segments)
        const polylineCoords =
          routeGeometry && routeGeometry.length > 0 ? routeGeometry : validPoints;

        const routeLine = L.polyline(polylineCoords, {
          color: '#0284c7',
          weight: 5,
          opacity: 0.85,
          lineJoin: 'round',
        }).addTo(map);

        // Add Numbered Markers
        markersData.forEach((m) => {
          const isDone = m.customer.lastCleanedDate === new Date().toISOString().split('T')[0];
          const bg = isDone ? '#10b981' : '#0284c7';

          const iconHtml = `
            <div style="
              background: ${bg};
              color: white;
              width: 26px;
              height: 26px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: 800;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.35);
            ">
              ${m.label}
            </div>
          `;

          const customIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-route-marker',
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });

          const marker = L.marker([m.lat, m.lng], { icon: customIcon }).addTo(map);
          marker.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
              <strong>Stop #${m.label}: ${m.customer.name}</strong><br/>
              <span>${m.customer.address}</span><br/>
              <span style="color: #059669; font-weight: bold;">£${m.customer.price}</span>
            </div>
          `);
        });

        // Fit bounds around the plotted route
        try {
          map.fitBounds(routeLine.getBounds(), { padding: [35, 35] });
        } catch {}
      }
    };

    loadAndRenderMap();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch {}
        leafletMapRef.current = null;
      }
    };
  }, [isOpen, orderedStops, routeGeometry]);

  if (!isOpen) return null;

  const currentOrderedCustomers = orderedStops.map((s) => s.customer);

  const handleStartRunner = () => {
    onStartRouteRunner(currentOrderedCustomers);
    onClose();
  };

  const handleOpenGoogleMaps = () => {
    const addresses = currentOrderedCustomers.map((c) => c.address);
    const url = getMultiStopGoogleMapsUrl(
      addresses,
      startAddress !== 'My Current GPS Location' ? startAddress : undefined
    );
    window.open(url, '_blank');
  };

  const totalEarnings = orderedStops.reduce((sum, s) => sum + (s.customer.price || 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-brand-600 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">Trade Route Planner</h2>
              <p className="text-xs text-slate-500">Shortest driving route & turn-by-turn order</p>
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
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          {/* 1. Scope Selector Bar (Today, This Week, All Rounds) */}
          <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setScope('today')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                scope === 'today'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Today ({todayCustomers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setScope('week')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                scope === 'week'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>This Week ({weekCustomers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                scope === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>All Rounds ({allCustomers.length})</span>
            </button>
          </div>

          {/* 2. Start Point & Settings Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <Home className="w-3.5 h-3.5 text-slate-400" />
                Route Start Location
              </span>
              <button
                type="button"
                onClick={handleUseGps}
                className="text-xs text-brand-600 hover:text-brand-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Navigation className="w-3 h-3" />
                <span>Use Current GPS</span>
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={startAddress}
                onChange={(e) => handleSaveStartAddress(e.target.value)}
                placeholder="Enter Depot or Home Postcode (e.g. BS1 4DJ)"
                className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => runOptimization(activeCustomers)}
                disabled={isLoading || activeCustomers.length === 0}
                className="px-3 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Re-Plan</span>
              </button>
            </div>
          </div>

          {/* 3. Interactive Leaflet Map Canvas */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 relative h-48 sm:h-56 shadow-inner">
            <div ref={mapContainerRef} className="w-full h-full" />
            {isLoading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
                <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
                <span>Computing shortest road route...</span>
              </div>
            )}
          </div>

          {/* 4. Route Summary Metrics Pill */}
          <div className="grid grid-cols-4 gap-2 bg-sky-50/70 border border-sky-100 rounded-xl p-3 text-center">
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Stops</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900">
                {orderedStops.length}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Drive</span>
              <span className="text-sm sm:text-base font-extrabold text-brand-600">
                {totalMiles} mi
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Est. Time</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900">
                {totalMinutes} min
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Revenue</span>
              <span className="text-sm sm:text-base font-extrabold text-emerald-600">
                £{totalEarnings}
              </span>
            </div>
          </div>

          {statusNotice && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{statusNotice}</span>
            </div>
          )}

          {/* 5. Turn-by-Turn Stop Order List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Turn-by-Turn Stop Order ({orderedStops.length})
              </h3>
              <span className="text-[11px] text-slate-400">Tap check to mark done</span>
            </div>

            {orderedStops.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">
                  No cleans found in this view.
                </p>
                <div className="flex justify-center gap-2 pt-1">
                  {scope !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setScope('all')}
                      className="px-3 py-1.5 bg-brand-600 text-white rounded-xl text-xs font-bold"
                    >
                      Route All Rounds ({allCustomers.length})
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {orderedStops.map((stop, index) => {
                  const isDone = stop.customer.lastCleanedDate === todayStr;

                  return (
                    <div
                      key={stop.customer.id}
                      className={`bg-white border rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xs transition-all ${
                        isDone
                          ? 'border-emerald-300 bg-emerald-50/30'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Checkbox button */}
                        <button
                          type="button"
                          onClick={() => onMarkComplete && onMarkComplete(stop.customer)}
                          className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                            isDone
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'border-2 border-slate-300 hover:border-emerald-500 text-transparent'
                          }`}
                          title="Check off stop"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>

                        <span className="w-6 h-6 rounded-full bg-brand-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                          {stop.stopIndex}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold text-xs truncate ${
                                isDone ? 'line-through text-slate-400' : 'text-slate-900'
                              }`}
                            >
                              {stop.customer.name}
                            </span>
                            <span className="font-extrabold text-[11px] text-emerald-700">
                              £{stop.customer.price}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {stop.customer.address}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-medium text-slate-400 hidden sm:inline mr-1">
                          {stop.distanceFromPrevMiles} mi
                        </span>

                        {/* Single-leg Drive button */}
                        <button
                          onClick={() => {
                            const url = getSingleStopNavUrl(
                              stop.customer.address,
                              selectedNavApp
                            );
                            window.open(url, '_blank');
                          }}
                          className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Drive to this house"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                        </button>

                        {/* Reorder Arrows */}
                        <button
                          onClick={() => handleMoveStop(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 rounded"
                          title="Move earlier"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveStop(index, 'down')}
                          disabled={index === orderedStops.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 rounded"
                          title="Move later"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
          {/* 1. Start Route Runner */}
          <button
            onClick={handleStartRunner}
            disabled={orderedStops.length === 0}
            className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 active:scale-98 disabled:bg-slate-300 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Active Route Runner ({orderedStops.length} Stops)</span>
          </button>

          {/* 2. Open Google Maps */}
          <button
            onClick={handleOpenGoogleMaps}
            disabled={orderedStops.length === 0}
            className="py-3 px-4 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-slate-500" />
            <span>Open in Google Maps</span>
          </button>
        </div>
      </div>
    </div>
  );
}
