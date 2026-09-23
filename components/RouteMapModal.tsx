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
  AlertCircle,
  Play,
  Share2,
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
  setLocalNavApp,
} from '@/lib/storage';

interface RouteMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onApplyRouteOrder: (orderedCustomers: Customer[]) => void;
  onStartRouteRunner: (orderedCustomers: Customer[]) => void;
}

export function RouteMapModal({
  isOpen,
  onClose,
  customers,
  onApplyRouteOrder,
  onStartRouteRunner,
}: RouteMapModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [orderedStops, setOrderedStops] = useState<RouteStop[]>([]);
  const [totalMiles, setTotalMiles] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [usedRoadNetwork, setUsedRoadNetwork] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | undefined>(undefined);

  // Start Location state
  const [useGps, setUseGps] = useState(false);
  const [startAddress, setStartAddress] = useState('');
  const [startCoords, setStartCoords] = useState<GeoLocation | undefined>(undefined);
  const [selectedNavApp, setSelectedNavApp] = useState<NavApp>('google');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Initialize preferences on open
  useEffect(() => {
    if (!isOpen) return;
    const savedLoc = getLocalStartLocation();
    if (savedLoc) {
      setStartAddress(savedLoc.address);
      if (savedLoc.lat && savedLoc.lng) {
        setStartCoords({ lat: savedLoc.lat, lng: savedLoc.lng, address: savedLoc.address });
      }
    }
    setSelectedNavApp(getLocalNavApp());
  }, [isOpen]);

  // Run Route Optimization
  const handleOptimize = async (overrideStart?: GeoLocation) => {
    setIsLoading(true);
    setStatusMessage(null);

    const activeStart = overrideStart || startCoords;

    try {
      const result = await optimizeTradeRoute(customers, activeStart);
      setOrderedStops(result.routeStops);
      setTotalMiles(result.totalDistanceMiles);
      setTotalMinutes(result.totalDurationMinutes);
      setUsedRoadNetwork(result.usedRoadNetwork);
      setRouteGeometry(result.routeGeometry);
    } catch (e: any) {
      console.error('Route optimization error:', e);
      setStatusMessage('Optimization encountered an issue. Using street-order fallback.');
    } finally {
      setIsLoading(false);
    }
  };

  // Run on modal open or when customer list changes
  useEffect(() => {
    if (isOpen && customers.length > 0) {
      handleOptimize();
    }
  }, [isOpen, customers.length]);

  // Handle GPS start location
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setStatusMessage('Geolocation is not supported by your browser.');
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
        setUseGps(true);
        setStartCoords(coords);
        setStartAddress('My Current GPS Location');
        setLocalStartLocation(coords);
        handleOptimize(coords);
      },
      (err) => {
        setIsLoading(false);
        setStatusMessage('Could not retrieve GPS location. Please enter a postcode instead.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Save manual depot address
  const handleSaveStartAddress = (val: string) => {
    setStartAddress(val);
    setUseGps(false);
    const loc = { address: val };
    setLocalStartLocation(loc);
    setStartCoords({ lat: 0, lng: 0, address: val });
  };

  // Reordering helpers (Move Stop Up / Down)
  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedStops.length) return;

    const copy = [...orderedStops];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    // Renumber stops
    const renumbered = copy.map((stop, i) => ({
      ...stop,
      stopIndex: i + 1,
    }));

    setOrderedStops(renumbered);
  };

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || orderedStops.length === 0) return;

    let isMounted = true;

    // Load Leaflet CSS and JS dynamically if not present
    const loadLeaflet = async () => {
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

      // Clean up previous map instance
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      // Collect points with coordinates
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

      if (validPoints.length === 0) return;

      // Initialize Map
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      });
      leafletMapRef.current = map;

      // OpenStreetMap Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Draw Polyline route
      const polylineCoords = routeGeometry && routeGeometry.length > 0 ? routeGeometry : validPoints;
      const routeLine = L.polyline(polylineCoords, {
        color: '#0284c7',
        weight: 5,
        opacity: 0.85,
        lineJoin: 'round',
      }).addTo(map);

      // Add Numbered Markers
      markersData.forEach((m) => {
        const iconHtml = `
          <div style="
            background: #0284c7;
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
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
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

      // Fit map bounds to show all markers
      map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
    };

    loadLeaflet();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
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
    const url = getMultiStopGoogleMapsUrl(addresses, startAddress !== 'My Current GPS Location' ? startAddress : undefined);
    window.open(url, '_blank');
  };

  const totalEarnings = orderedStops.reduce((sum, s) => sum + (s.customer.price || 0), 0);

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
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Start Point & Settings Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <Home className="w-3.5 h-3.5 text-slate-400" />
                Route Start Location
              </span>
              <button
                type="button"
                onClick={handleUseGps}
                className="text-xs text-brand-600 hover:text-brand-800 font-bold flex items-center gap-1"
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
                placeholder="Enter Home Base Postcode (e.g. BS1 4DJ)"
                className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => handleOptimize()}
                disabled={isLoading}
                className="px-3 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all"
              >
                {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Re-Plan</span>
              </button>
            </div>
          </div>

          {/* Interactive Map Canvas */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 relative h-48 sm:h-60 shadow-inner">
            <div ref={mapContainerRef} className="w-full h-full" />
            {isLoading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
                <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
                <span>Optimizing road route...</span>
              </div>
            )}
          </div>

          {/* Route Summary Metrics Pill */}
          <div className="grid grid-cols-4 gap-2 bg-sky-50/70 border border-sky-100 rounded-xl p-3 text-center">
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Stops</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900">{orderedStops.length}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Drive</span>
              <span className="text-sm sm:text-base font-extrabold text-brand-600">{totalMiles} mi</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Est. Time</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900">{totalMinutes} min</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Earnings</span>
              <span className="text-sm sm:text-base font-extrabold text-emerald-600">£{totalEarnings}</span>
            </div>
          </div>

          {usedRoadNetwork && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 px-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Real road network routing applied (OSRM) with street-by-street clustering.</span>
            </div>
          )}

          {/* Stop-by-Stop Order List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Turn-by-Turn Stop Order ({orderedStops.length})
              </h3>
              <span className="text-[11px] text-slate-400">Use arrows to adjust order</span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {orderedStops.map((stop, index) => (
                <div
                  key={stop.customer.id}
                  className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xs hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-brand-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      {stop.stopIndex}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">
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
                    {/* Distance from previous */}
                    <span className="text-[10px] font-medium text-slate-400 hidden sm:inline mr-1">
                      {stop.distanceFromPrevMiles} mi
                    </span>

                    {/* Single-leg Drive button */}
                    <button
                      onClick={() => {
                        const url = getSingleStopNavUrl(stop.customer.address, selectedNavApp);
                        window.open(url, '_blank');
                      }}
                      className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Navigate to this house"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </button>

                    {/* Reorder Arrows */}
                    <button
                      onClick={() => handleMoveStop(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 rounded"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveStop(index, 'down')}
                      disabled={index === orderedStops.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 rounded"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
          {/* 1. Start Route Runner */}
          <button
            onClick={handleStartRunner}
            className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Active Route Runner</span>
          </button>

          {/* 2. Open Google Maps */}
          <button
            onClick={handleOpenGoogleMaps}
            className="py-3 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
          >
            <Share2 className="w-4 h-4 text-slate-500" />
            <span>Open in Google Maps</span>
          </button>
        </div>
      </div>
    </div>
  );
}
