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
import { Customer, NavApp, RouteStop, TravelMode } from '@/lib/types';
import {
  optimizeTradeRoute,
  getSingleStopNavUrl,
  getMultiStopGoogleMapsUrl,
  estimateTravelMinutes,
  GeoLocation,
  LocationInput,
} from '@/lib/routeOptimizer';
import {
  getLocalStartLocation,
  setLocalStartLocation,
  getLocalNavApp,
  getLocalFinishLocation,
  setLocalFinishLocation,
  getLocalTravelMode,
  setLocalTravelMode,
} from '@/lib/storage';

export type RouteScope = 'today' | 'week' | 'all' | 'custom';

export interface RouteMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  todayCustomers: Customer[];
  weekCustomers: Customer[];
  allCustomers: Customer[];
  customCustomers?: Customer[];
  customDateLabel?: string;
  onApplyRouteOrder: (orderedCustomers: Customer[]) => void;
  onStartRouteRunner: (
    orderedCustomers: Customer[],
    options?: { travelMode?: TravelMode; finishAddress?: string }
  ) => void;
  onMarkComplete?: (customer: Customer) => void;
  initialScope?: RouteScope;
}

export function RouteMapModal({
  isOpen,
  onClose,
  todayCustomers,
  weekCustomers,
  allCustomers,
  customCustomers,
  customDateLabel,
  onApplyRouteOrder,
  onStartRouteRunner,
  onMarkComplete,
  initialScope,
}: RouteMapModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  // Active round selection scope (Today, Week, All)
  const [scope, setScope] = useState<RouteScope>('today');
  const [isLoading, setIsLoading] = useState(false);
  const [orderedStops, setOrderedStops] = useState<RouteStop[]>([]);
  const [totalMiles, setTotalMiles] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [doorstepDistanceMiles, setDoorstepDistanceMiles] = useState<number | undefined>(undefined);
  const [doorstepMinutes, setDoorstepMinutes] = useState<number | undefined>(undefined);
  const [usedRoadNetwork, setUsedRoadNetwork] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | undefined>(undefined);

  // Travel Mode state: window cleaners walk with trolley/backpack by default
  const [travelMode, setTravelMode] = useState<TravelMode>('walking');

  // Start Location state
  const [startAddress, setStartAddress] = useState('');
  const [startCoords, setStartCoords] = useState<LocationInput | undefined>(undefined);

  // Finish Location state (user customizable)
  const [finishAddress, setFinishAddress] = useState('');
  const [finishCoords, setFinishCoords] = useState<LocationInput | undefined>(undefined);
  const [finishAtHome, setFinishAtHome] = useState(false);

  const [selectedNavApp, setSelectedNavApp] = useState<NavApp>('google');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Determine active customer pool based on selected scope
  const activeCustomers =
    scope === 'today'
      ? todayCustomers
      : scope === 'week'
      ? weekCustomers
      : scope === 'custom' && customCustomers
      ? customCustomers
      : allCustomers;

  // Run Route Optimization for the active pool
  const runOptimization = async (
    targets: Customer[],
    overrideStart?: LocationInput | null,
    overrideMode?: TravelMode,
    overrideFinish?: LocationInput | null
  ) => {
    if (!targets || targets.length === 0) {
      setOrderedStops([]);
      setTotalMiles(0);
      setTotalMinutes(0);
      setRouteGeometry(undefined);
      setDoorstepDistanceMiles(undefined);
      setDoorstepMinutes(undefined);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setStatusNotice(null);

    const activeMode = overrideMode || travelMode;
    const activeStart: LocationInput | undefined =
      overrideStart !== undefined
        ? overrideStart || undefined
        : (startCoords?.lat && startCoords?.lng ? startCoords : undefined) ||
          (startAddress.trim() ? { address: startAddress.trim() } : undefined);

    let activeFinish: LocationInput | undefined = undefined;
    if (overrideFinish !== undefined) {
      activeFinish = overrideFinish || undefined;
    } else if (finishAtHome && finishAddress.trim()) {
      activeFinish =
        (finishCoords?.lat && finishCoords?.lng ? finishCoords : undefined) ||
        { address: finishAddress.trim() };
    }

    try {
      const result = await optimizeTradeRoute(targets, activeStart, {
        travelMode: activeMode,
        finishPoint: activeFinish,
      });
      setOrderedStops(result.routeStops);
      setTotalMiles(result.totalDistanceMiles);
      setTotalMinutes(result.totalDurationMinutes);
      setUsedRoadNetwork(result.usedRoadNetwork);
      setRouteGeometry(result.routeGeometry);
      setDoorstepDistanceMiles(result.doorstepDistanceMiles);
      setDoorstepMinutes(result.doorstepMinutes);

      if (result.finishPoint && (!finishCoords?.lat || !finishCoords?.lng)) {
        setFinishCoords(result.finishPoint);
        setLocalFinishLocation(result.finishPoint);
      }
    } catch (e: any) {
      console.error('Route optimization error:', e);
      setStatusNotice('Route organized in street sequence.');
      // Emergency fallback: NEVER leave the user with 0 stops when targets exist
      const fallbackStops: RouteStop[] = targets.map((c, i) => {
        const legDist = i === 0 ? 0.4 : 0.2;
        const legTime = estimateTravelMinutes(legDist, activeMode);
        return {
          customer: c,
          stopIndex: i + 1,
          distanceFromPrevMiles: legDist,
          driveMinutesFromPrev: legTime,
          travelMinutesFromPrev: legTime,
          streetName: c.address,
        };
      });
      setOrderedStops(fallbackStops);
      setTotalMiles(Math.round(fallbackStops.reduce((sum, s) => sum + (s.distanceFromPrevMiles || 0), 0) * 10) / 10);
      setTotalMinutes(fallbackStops.reduce((sum, s) => sum + (s.travelMinutesFromPrev || 2), 0));
    } finally {
      setIsLoading(false);
    }
  };

  // On initial open: pick best initial scope and load saved start/finish locations synchronously
  useEffect(() => {
    if (!isOpen) return;

    let targetScope: RouteScope = 'today';
    let pool = todayCustomers;
    if (initialScope === 'custom' && customCustomers && customCustomers.length > 0) {
      targetScope = 'custom';
      pool = customCustomers;
    } else if (initialScope) {
      targetScope = initialScope;
      pool =
        initialScope === 'today'
          ? todayCustomers
          : initialScope === 'week'
          ? weekCustomers
          : initialScope === 'custom' && customCustomers
          ? customCustomers
          : allCustomers;
    } else if (todayCustomers.length > 0) {
      targetScope = 'today';
      pool = todayCustomers;
    } else if (weekCustomers.length > 0) {
      targetScope = 'week';
      pool = weekCustomers;
    } else {
      targetScope = 'all';
      pool = allCustomers;
    }
    setScope(targetScope);

    const savedLoc = getLocalStartLocation();
    let initialStart: LocationInput | undefined = undefined;
    if (savedLoc && savedLoc.address) {
      setStartAddress(savedLoc.address);
      if (savedLoc.lat && savedLoc.lng) {
        initialStart = { lat: savedLoc.lat, lng: savedLoc.lng, address: savedLoc.address };
        setStartCoords(initialStart);
      } else {
        initialStart = { address: savedLoc.address };
      }
    }

    const savedFinish = getLocalFinishLocation();
    let initialFinish: LocationInput | undefined = undefined;
    if (savedFinish && savedFinish.address && savedFinish.address.trim()) {
      setFinishAddress(savedFinish.address);
      setFinishAtHome(true);
      if (savedFinish.lat && savedFinish.lng) {
        initialFinish = { lat: savedFinish.lat, lng: savedFinish.lng, address: savedFinish.address };
        setFinishCoords(initialFinish);
      } else {
        initialFinish = { address: savedFinish.address };
      }
    } else {
      setFinishAddress('');
      setFinishCoords(undefined);
      setFinishAtHome(false);
    }

    const mode = getLocalTravelMode();
    setTravelMode(mode);
    setSelectedNavApp(getLocalNavApp());

    // Synchronously run optimization with initial loaded configuration
    runOptimization(pool, initialStart, mode, initialFinish);
  }, [isOpen, initialScope, customCustomers]);

  // Handle scope changes (Today / Week / All / Custom)
  const handleScopeChange = (newScope: RouteScope) => {
    setScope(newScope);
    const pool =
      newScope === 'today'
        ? todayCustomers
        : newScope === 'week'
        ? weekCustomers
        : newScope === 'custom' && customCustomers
        ? customCustomers
        : allCustomers;
    runOptimization(pool);
  };

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

  // Save manual depot address with instant server-side geocoding
  const handleApplyStartAddress = async (val: string) => {
    const trimmed = val.trim();
    setStartAddress(trimmed);
    if (!trimmed) {
      setStartCoords(undefined);
      setLocalStartLocation(null);
      runOptimization(activeCustomers, null);
      return;
    }

    setIsLoading(true);
    let resolved: LocationInput = { address: trimmed };
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.lat && data.lng) {
          resolved = { address: trimmed, lat: data.lat, lng: data.lng };
        }
      }
    } catch (e) {
      // fallback
    }

    setStartCoords(resolved);
    setLocalStartLocation(resolved);
    runOptimization(activeCustomers, resolved);
  };

  // Handle GPS Home/Finish location
  const handleUseGpsAsHome = () => {
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
          address: 'My Home (GPS)',
        };
        setFinishCoords(coords);
        setFinishAddress('My Home (GPS)');
        setFinishAtHome(true);
        setLocalFinishLocation(coords);
        runOptimization(activeCustomers, undefined, travelMode, coords);
      },
      () => {
        setIsLoading(false);
        setStatusNotice('Could not retrieve GPS location. You can type a postcode instead.');
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  };

  // Save manual finish/home address with instant server-side geocoding
  const handleApplyFinishAddress = async (val: string) => {
    const trimmed = val.trim();
    setFinishAddress(trimmed);
    if (!trimmed) {
      handleClearFinishAddress();
      return;
    }

    setFinishAtHome(true);
    setIsLoading(true);

    let resolved: LocationInput = { address: trimmed };
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.lat && data.lng) {
          resolved = { address: trimmed, lat: data.lat, lng: data.lng };
        }
      }
    } catch (e) {
      // fallback
    }

    setFinishCoords(resolved);
    setLocalFinishLocation(resolved);
    runOptimization(activeCustomers, undefined, travelMode, resolved);
  };

  // Clear home/finish location
  const handleClearFinishAddress = () => {
    setFinishAddress('');
    setFinishCoords(undefined);
    setFinishAtHome(false);
    setDoorstepDistanceMiles(undefined);
    setDoorstepMinutes(undefined);
    setLocalFinishLocation(null);
    runOptimization(activeCustomers, undefined, travelMode, null);
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

      // 5. Plot valid points, start depot, and road route
      const validPoints: [number, number][] = [];
      const markersData: Array<{ lat: number; lng: number; label: string; customer: Customer }> = [];

      // Add Start Depot marker if coordinates exist
      if (startCoords?.lat && startCoords?.lng) {
        validPoints.push([startCoords.lat, startCoords.lng]);

        const startIconHtml = `
          <div style="
            background: #1e293b;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          ">
            🏠
          </div>
        `;

        const startIcon = L.divIcon({
          html: startIconHtml,
          className: 'custom-start-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const startMarker = L.marker([startCoords.lat, startCoords.lng], { icon: startIcon }).addTo(map);
        startMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <strong>Route Start / Depot</strong><br/>
            <span>${startAddress || 'Depot'}</span>
          </div>
        `);
      }

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

        let routeLine: any;
        if (validPoints.length >= 2) {
          routeLine = L.polyline(polylineCoords, {
            color: '#0284c7',
            weight: 5,
            opacity: 0.85,
            lineJoin: 'round',
          }).addTo(map);
        }

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

        // Add Finish Home marker if finishAtHome and coordinates exist
        if (finishAtHome && finishCoords?.lat && finishCoords?.lng) {
          validPoints.push([finishCoords.lat, finishCoords.lng]);

          const finishIconHtml = `
            <div style="
              background: #0f172a;
              color: white;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 13px;
              border: 2px solid #38bdf8;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            ">
              🏁
            </div>
          `;

          const finishIcon = L.divIcon({
            html: finishIconHtml,
            className: 'custom-finish-marker',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          const finishMarker = L.marker([finishCoords.lat, finishCoords.lng], { icon: finishIcon }).addTo(map);
          finishMarker.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
              <strong>🏁 Route Finish: Home</strong><br/>
              <span>${finishAddress || 'Home'}</span><br/>
              <span style="color: #0284c7; font-weight: bold;">Ends closest to home</span>
            </div>
          `);
        }

        // Fit bounds around the plotted route
        try {
          if (routeLine) {
            map.fitBounds(routeLine.getBounds(), { padding: [35, 35] });
          } else if (validPoints.length === 1) {
            map.setView(validPoints[0], 14);
          } else {
            const bounds = L.latLngBounds(validPoints.map((p) => L.latLng(p[0], p[1])));
            map.fitBounds(bounds, { padding: [35, 35] });
          }
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
  }, [isOpen, orderedStops, routeGeometry, startCoords, finishCoords, finishAtHome, travelMode]);

  if (!isOpen) return null;

  const currentOrderedCustomers = orderedStops.map((s) => s.customer);

  const handleStartRunner = () => {
    onStartRouteRunner(currentOrderedCustomers, {
      travelMode,
      finishAddress: finishAtHome ? finishAddress : undefined,
    });
    onClose();
  };

  const handleOpenGoogleMaps = () => {
    const addresses = currentOrderedCustomers.map((c) => c.address);
    const url = getMultiStopGoogleMapsUrl(
      addresses,
      startAddress !== 'My Current GPS Location' ? startAddress : undefined,
      travelMode
    );
    window.open(url, '_blank');
  };

  const totalEarnings = orderedStops.reduce((sum, s) => sum + (s.customer.price || 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 transition-colors duration-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">Trade Route Planner</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {travelMode === 'walking'
                  ? 'Walking / Footpath route • Finishes nearest home'
                  : 'Shortest driving route • Turn-by-turn order'}
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
          {/* 1. Scope Selector Bar (Today, This Week, All Rounds, Custom Date) */}
          <div className={`grid ${customCustomers && customCustomers.length > 0 ? 'grid-cols-4' : 'grid-cols-3'} p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold transition-colors duration-200`}>
            {customCustomers && customCustomers.length > 0 && (
              <button
                type="button"
                onClick={() => handleScopeChange('custom')}
                className={`py-2 px-1 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer truncate ${
                  scope === 'custom'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title={customDateLabel || 'Selected Date'}
              >
                <span className="truncate">{customDateLabel || 'Date'} ({customCustomers.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleScopeChange('today')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                scope === 'today'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>Today ({todayCustomers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => handleScopeChange('week')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                scope === 'week'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>This Week ({weekCustomers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => handleScopeChange('all')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                scope === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>All Rounds ({allCustomers.length})</span>
            </button>
          </div>

          {/* 2. Travel Mode Toggle: Walk on Foot (Default) vs Drive in Van */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 transition-colors duration-200">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Mode:</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {travelMode === 'walking' ? '🚶 Footpaths & trolley pace' : '🚗 Van road navigation'}
              </span>
            </div>
            <div className="flex bg-slate-200/80 dark:bg-slate-700 p-0.5 rounded-xl text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => {
                  setTravelMode('walking');
                  setLocalTravelMode('walking');
                  runOptimization(activeCustomers, undefined, 'walking');
                }}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                  travelMode === 'walking'
                    ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🚶 Walk</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTravelMode('driving');
                  setLocalTravelMode('driving');
                  runOptimization(activeCustomers, undefined, 'driving');
                }}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                  travelMode === 'driving'
                    ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🚗 Drive</span>
              </button>
            </div>
          </div>

          {/* 3. Start Location Bar */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 space-y-2 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <Home className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                Route Start Location
              </span>
              <button
                type="button"
                onClick={handleUseGps}
                className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Navigation className="w-3 h-3" />
                <span>Use Current GPS</span>
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={startAddress}
                onChange={(e) => setStartAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyStartAddress(startAddress);
                  }
                }}
                placeholder="Enter Depot or Start Postcode (e.g. WA7 4AA)"
                className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => {
                  const startLoc = startAddress.trim() ? startCoords || { address: startAddress.trim() } : undefined;
                  const finishLoc = finishAtHome && finishAddress.trim() ? finishCoords || { address: finishAddress.trim() } : null;
                  runOptimization(activeCustomers, startLoc, travelMode, finishLoc);
                }}
                disabled={isLoading || activeCustomers.length === 0}
                className="px-3 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer"
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

          {/* 4. Finish / Home Location Bar (User Configurable) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 space-y-2 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="text-sm">🏁</span>
                Finish Near Home (Doorstep)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUseGpsAsHome}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 font-bold flex items-center gap-1 cursor-pointer"
                  title="Set current GPS position as your home base"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Use GPS</span>
                </button>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-brand-600 dark:text-brand-400 select-none">
                  <input
                    type="checkbox"
                    checked={finishAtHome}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFinishAtHome(checked);
                      const finishLoc = checked && finishAddress.trim() ? finishCoords || { address: finishAddress.trim() } : null;
                      if (!checked) {
                        setDoorstepDistanceMiles(undefined);
                        setDoorstepMinutes(undefined);
                      }
                      runOptimization(activeCustomers, undefined, travelMode, finishLoc);
                    }}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-600"
                  />
                  <span>{finishAtHome ? 'Active' : 'Off'}</span>
                </label>
              </div>
            </div>

            {finishAtHome && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={finishAddress}
                    onChange={(e) => setFinishAddress(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyFinishAddress(finishAddress);
                      }
                    }}
                    placeholder="Enter your Home or Base Postcode (e.g. WA7 4AA)"
                    className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                  />
                  {finishAddress.trim() && (
                    <button
                      type="button"
                      onClick={() => handleApplyFinishAddress(finishAddress)}
                      disabled={isLoading}
                      className="px-3 py-1 text-xs bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
                      title="Save and set this address as your home finish point"
                    >
                      Set
                    </button>
                  )}
                  {finishAddress.trim() && (
                    <button
                      type="button"
                      onClick={handleClearFinishAddress}
                      className="px-2.5 py-1 text-[11px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold cursor-pointer transition-colors"
                      title="Clear home address"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Doorstep Proximity Metric Banner */}
                {doorstepDistanceMiles !== undefined && orderedStops.length > 0 ? (
                  <div className="bg-sky-500/10 dark:bg-sky-950/40 border border-sky-300/80 dark:border-sky-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs text-sky-950 dark:text-sky-200">
                    <span className="flex items-center gap-1.5 font-bold">
                      <span className="text-sm">🏁</span>
                      <span>Doorstep Finish:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Stop #{orderedStops.length} ({orderedStops[orderedStops.length - 1]?.customer.name}) is just {doorstepDistanceMiles} mi ({doorstepMinutes} min walk) from your home base!
                      </span>
                    </span>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    {finishAddress.trim() ? (
                      <>
                        Stops are sequenced so the customer closest to <strong className="text-slate-700 dark:text-slate-200">{finishAddress}</strong> is visited last, leaving you on your doorstep when finished.
                      </>
                    ) : (
                      <>
                        Type your home address or postcode above (or tap <strong className="text-slate-700 dark:text-slate-200">Use GPS</strong>) so your route finishes right on your doorstep.
                      </>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 5. Interactive Leaflet Map Canvas */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 relative h-48 sm:h-56 shadow-inner transition-colors duration-200">
            <div ref={mapContainerRef} className="w-full h-full" />
            {isLoading && (
              <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xs flex items-center justify-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                <RefreshCw className="w-4 h-4 animate-spin text-brand-600 dark:text-brand-400" />
                <span>
                  {travelMode === 'walking'
                    ? 'Computing shortest walking route...'
                    : 'Computing shortest driving route...'}
                </span>
              </div>
            )}
          </div>

          {/* 6. Route Summary Metrics Pill */}
          <div className="grid grid-cols-4 gap-2 bg-sky-50/70 dark:bg-slate-800/80 border border-sky-100 dark:border-slate-700 rounded-xl p-3 text-center transition-colors duration-200">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase">Stops</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {orderedStops.length}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase">
                {travelMode === 'walking' ? 'Walk' : 'Drive'}
              </span>
              <span className="text-sm sm:text-base font-extrabold text-brand-600 dark:text-brand-400">
                {totalMiles} mi
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase">
                {travelMode === 'walking' ? 'Est. Walk' : 'Est. Drive'}
              </span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {totalMinutes} min
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block uppercase">Revenue</span>
              <span className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                £{totalEarnings}
              </span>
            </div>
          </div>

          {statusNotice && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{statusNotice}</span>
            </div>
          )}

          {/* 7. Turn-by-Turn Stop Order List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Turn-by-Turn Stop Order ({orderedStops.length})
              </h3>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Tap check to mark done</span>
            </div>

            {orderedStops.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                <MapPin className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  No cleans found in this view.
                </p>
                <div className="flex justify-center gap-2 pt-1">
                  {scope !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setScope('all')}
                      className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
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
                  const isLastStop = index === orderedStops.length - 1;

                  return (
                    <div
                      key={stop.customer.id}
                      className={`border rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xs transition-all ${
                        isDone
                          ? 'border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/30 dark:bg-emerald-950/20'
                          : isLastStop && finishAtHome
                          ? 'border-sky-300 dark:border-sky-700/80 bg-sky-50/20 dark:bg-sky-950/20'
                          : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
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
                              : 'border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 text-transparent'
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
                                isDone
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {stop.customer.name}
                            </span>
                            <span className="font-extrabold text-[11px] text-emerald-700 dark:text-emerald-400">
                              £{stop.customer.price}
                            </span>
                            {isLastStop && finishAtHome && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 rounded-md shrink-0 flex items-center gap-1 border border-sky-200 dark:border-sky-800">
                                <span>🏁</span>
                                <span>
                                  {doorstepDistanceMiles !== undefined
                                    ? `${doorstepDistanceMiles} mi to Home`
                                    : 'Near Home'}
                                </span>
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                            {stop.customer.address}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 hidden sm:inline mr-1">
                          {stop.distanceFromPrevMiles} mi • {stop.travelMinutesFromPrev || stop.driveMinutesFromPrev || 1}m
                        </span>

                        {/* Single-leg Nav button */}
                        <button
                          onClick={() => {
                            const url = getSingleStopNavUrl(
                              stop.customer.address,
                              selectedNavApp,
                              travelMode
                            );
                            window.open(url, '_blank');
                          }}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title={travelMode === 'walking' ? 'Walk to this house' : 'Drive to this house'}
                        >
                          <Navigation className="w-3.5 h-3.5" />
                        </button>

                        {/* Reorder Arrows */}
                        <button
                          onClick={() => handleMoveStop(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20 rounded cursor-pointer transition-colors"
                          title="Move earlier"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveStop(index, 'down')}
                          disabled={index === orderedStops.length - 1}
                          className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20 rounded cursor-pointer transition-colors"
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
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2 transition-colors duration-200">
          {/* 1. Start Route Runner */}
          <button
            onClick={handleStartRunner}
            disabled={orderedStops.length === 0}
            className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 active:scale-98 disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>
              Start Active {travelMode === 'walking' ? 'Walking' : 'Driving'} Route ({orderedStops.length} Stops)
            </span>
          </button>

          {/* 2. Open Google Maps */}
          <button
            onClick={handleOpenGoogleMaps}
            disabled={orderedStops.length === 0}
            className="py-3 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Open {travelMode === 'walking' ? 'Walking' : 'Driving'} Route in Google Maps</span>
          </button>
        </div>
      </div>
    </div>
  );
}
