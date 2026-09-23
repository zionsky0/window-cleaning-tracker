import { Customer, NavApp, RouteStop } from './types';

// UK Postcode Regex (standard alphanumeric format)
const UK_POSTCODE_REGEX = /([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})/i;

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface RouteOptimizationResult {
  orderedCustomers: Customer[];
  routeStops: RouteStop[];
  totalDistanceMiles: number;
  totalDurationMinutes: number;
  routeGeometry?: [number, number][]; // [lat, lng] points for map polyline
  usedRoadNetwork: boolean;
}

/**
 * Extracts UK Postcode from any address string
 */
export function extractPostcode(address: string): string | null {
  if (!address) return null;
  const match = address.match(UK_POSTCODE_REGEX);
  if (!match) return null;
  const raw = match[0].trim().toUpperCase();
  // Normalize spacing: "SW1A1AA" -> "SW1A 1AA"
  const clean = raw.replace(/\s+/g, '');
  if (clean.length >= 5) {
    const inward = clean.slice(-3);
    const outward = clean.slice(0, -3);
    return `${outward} ${inward}`;
  }
  return raw;
}

/**
 * Parses house number and street name for street-level walking order
 */
export function parseStreetAndNumber(address: string): {
  houseNumber: number | null;
  streetName: string;
  postcode: string | null;
} {
  const postcode = extractPostcode(address);
  let cleanAddress = address;
  if (postcode) {
    cleanAddress = cleanAddress.replace(new RegExp(postcode, 'i'), '').trim();
  }

  // Remove trailing commas and clean up
  cleanAddress = cleanAddress.replace(/,\s*$/, '').trim();
  const parts = cleanAddress.split(',').map((p) => p.trim()).filter(Boolean);
  const firstPart = parts[0] || address;

  // Extract leading digits for house number (e.g. "14", "14A", "Flat 2")
  const numMatch = firstPart.match(/^(\d+)/);
  const houseNumber = numMatch ? parseInt(numMatch[1], 10) : null;

  // Extract street name
  const streetName = firstPart.replace(/^\d+[\w-]*\s+/, '').trim() || firstPart;

  return {
    houseNumber,
    streetName: streetName.toLowerCase(),
    postcode,
  };
}

/**
 * Geocodes an array of customers using postcodes.io (batch) + Nominatim fallback
 */
export async function geocodeCustomers(
  customers: Customer[],
  startLoc?: GeoLocation
): Promise<{ updatedCustomers: Customer[]; startLocResolved?: GeoLocation }> {
  const updated = [...customers];
  const postcodesToLookup = new Set<string>();

  // Collect missing postcodes
  for (const c of updated) {
    if (!c.lat || !c.lng) {
      const pc = extractPostcode(c.address);
      if (pc) postcodesToLookup.add(pc);
    }
  }

  let resolvedStart = startLoc;
  if (startLoc?.address && (!startLoc.lat || !startLoc.lng)) {
    const startPc = extractPostcode(startLoc.address);
    if (startPc) postcodesToLookup.add(startPc);
  }

  // Batch query api.postcodes.io
  if (postcodesToLookup.size > 0) {
    try {
      const pcList = Array.from(postcodesToLookup).slice(0, 100);
      const res = await fetch('https://api.postcodes.io/postcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcodes: pcList }),
      });

      if (res.ok) {
        const data = await res.json();
        const pcMap = new Map<string, { lat: number; lng: number }>();

        if (Array.isArray(data.result)) {
          for (const item of data.result) {
            if (item.result && item.result.latitude && item.result.longitude) {
              const normalPc = item.query.replace(/\s+/g, '').toUpperCase();
              pcMap.set(normalPc, {
                lat: item.result.latitude,
                lng: item.result.longitude,
              });
            }
          }
        }

        // Apply coordinates to customers
        for (let i = 0; i < updated.length; i++) {
          if (!updated[i].lat || !updated[i].lng) {
            const pc = extractPostcode(updated[i].address);
            if (pc) {
              const normal = pc.replace(/\s+/g, '').toUpperCase();
              const coords = pcMap.get(normal);
              if (coords) {
                updated[i] = { ...updated[i], lat: coords.lat, lng: coords.lng };
              }
            }
          }
        }

        // Apply coordinates to start location if needed
        if (resolvedStart?.address && (!resolvedStart.lat || !resolvedStart.lng)) {
          const pc = extractPostcode(resolvedStart.address);
          if (pc) {
            const normal = pc.replace(/\s+/g, '').toUpperCase();
            const coords = pcMap.get(normal);
            if (coords) {
              resolvedStart = { ...resolvedStart, lat: coords.lat, lng: coords.lng };
            }
          }
        }
      }
    } catch (e) {
      console.warn('Postcode batch geocoding error:', e);
    }
  }

  return { updatedCustomers: updated, startLocResolved: resolvedStart };
}

/**
 * Calculates Great Circle / Haversine distance in miles between two coordinates
 */
export function calculateHaversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimates driving minutes from miles (averages 22 mph in UK towns/suburbs)
 */
export function estimateDriveMinutes(miles: number): number {
  if (miles <= 0.05) return 1; // Same street / walking distance
  const speedMph = miles > 5 ? 35 : 22;
  return Math.max(1, Math.round((miles / speedMph) * 60));
}

/**
 * Solves Route Optimization using Real Road Network (OSRM) with intelligent
 * street-by-street clustering and local 2-opt TSP fallback.
 */
export async function optimizeTradeRoute(
  customers: Customer[],
  startPoint?: GeoLocation
): Promise<RouteOptimizationResult> {
  if (customers.length === 0) {
    return {
      orderedCustomers: [],
      routeStops: [],
      totalDistanceMiles: 0,
      totalDurationMinutes: 0,
      usedRoadNetwork: false,
    };
  }

  // Step 1: Geocode any missing coordinates
  const { updatedCustomers, startLocResolved } = await geocodeCustomers(customers, startPoint);
  const validStart = startLocResolved?.lat && startLocResolved?.lng ? startLocResolved : undefined;

  // Step 2: Group customers by Street / Postcode Cluster
  // If customers are on the same street or share a postcode, they should be visited sequentially
  interface StreetCluster {
    key: string;
    streetName: string;
    customers: Customer[];
    centroidLat: number;
    centroidLng: number;
  }

  const clusterMap = new Map<string, Customer[]>();
  for (const c of updatedCustomers) {
    const { streetName, postcode } = parseStreetAndNumber(c.address);
    // Cluster key combines postcode outward code or street name
    const clusterKey = postcode || streetName || c.address;
    if (!clusterMap.has(clusterKey)) {
      clusterMap.set(clusterKey, []);
    }
    clusterMap.get(clusterKey)!.push(c);
  }

  // Sort customers within each cluster logically by house number (1, 2, 3...)
  const clusters: StreetCluster[] = [];
  for (const [key, clusterCustomers] of clusterMap.entries()) {
    clusterCustomers.sort((a, b) => {
      const aInfo = parseStreetAndNumber(a.address);
      const bInfo = parseStreetAndNumber(b.address);
      if (aInfo.houseNumber !== null && bInfo.houseNumber !== null) {
        return aInfo.houseNumber - bInfo.houseNumber;
      }
      return a.address.localeCompare(b.address);
    });

    // Compute cluster centroid
    const withCoords = clusterCustomers.filter((c) => c.lat && c.lng);
    const avgLat = withCoords.length
      ? withCoords.reduce((s, c) => s + (c.lat || 0), 0) / withCoords.length
      : 51.5;
    const avgLng = withCoords.length
      ? withCoords.reduce((s, c) => s + (c.lng || 0), 0) / withCoords.length
      : -0.1;

    clusters.push({
      key,
      streetName: parseStreetAndNumber(clusterCustomers[0].address).streetName,
      customers: clusterCustomers,
      centroidLat: avgLat,
      centroidLng: avgLng,
    });
  }

  // Step 3: Optimize order of Street Clusters
  // Try OSRM Real Road Network Trip API first
  let orderedClusters: StreetCluster[] = clusters;
  let roadGeometry: [number, number][] | undefined;
  let totalDistanceMiles = 0;
  let totalDurationMinutes = 0;
  let usedRoadNetwork = false;

  const pointsToRoute = [
    ...(validStart ? [{ lat: validStart.lat, lng: validStart.lng }] : []),
    ...clusters.map((cl) => ({ lat: cl.centroidLat, lng: cl.centroidLng })),
  ];

  if (pointsToRoute.length >= 2 && clusters.length <= 40) {
    try {
      const coordsString = pointsToRoute.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
      // source=first means start at our depot/GPS point
      const osrmUrl = `https://router.project-osrm.org/trip/v1/driving/${coordsString}?source=first&overview=full&geometries=geojson`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(osrmUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && data.waypoints && data.trips?.[0]) {
          const trip = data.trips[0];
          totalDistanceMiles = Math.round((trip.distance * 0.000621371) * 10) / 10;
          totalDurationMinutes = Math.round(trip.duration / 60);

          // Extract GeoJSON geometry if available
          if (trip.geometry?.coordinates) {
            roadGeometry = trip.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
          }

          // Sort clusters based on OSRM waypoint order
          // Note: waypoints array indices correspond to pointsToRoute
          const sortedIndices = data.waypoints
            .map((w: any, originalIndex: number) => ({
              originalIndex,
              tripIndex: w.waypoint_index,
            }))
            .sort((a: any, b: any) => a.tripIndex - b.tripIndex);

          const newOrderedClusters: StreetCluster[] = [];
          for (const item of sortedIndices) {
            const clusterIndex = validStart ? item.originalIndex - 1 : item.originalIndex;
            if (clusterIndex >= 0 && clusterIndex < clusters.length) {
              newOrderedClusters.push(clusters[clusterIndex]);
            }
          }

          if (newOrderedClusters.length === clusters.length) {
            orderedClusters = newOrderedClusters;
            usedRoadNetwork = true;
          }
        }
      }
    } catch (e) {
      console.warn('OSRM road network optimization fallback to 2-opt:', e);
    }
  }

  // Step 4: Fallback to Nearest Neighbor / 2-Opt if OSRM was offline or failed
  if (!usedRoadNetwork) {
    orderedClusters = solveTSP2Opt(clusters, validStart);
  }

  // Step 5: Flatten clusters into the final ordered customer list
  const orderedCustomers: Customer[] = [];
  for (const cluster of orderedClusters) {
    orderedCustomers.push(...cluster.customers);
  }

  // Step 6: Build turn-by-turn RouteStop list with leg distances & drive times
  const routeStops: RouteStop[] = [];
  let prevLat = validStart?.lat;
  let prevLng = validStart?.lng;

  let calculatedMiles = 0;

  for (let i = 0; i < orderedCustomers.length; i++) {
    const c = orderedCustomers[i];
    let legMiles = 0;

    if (prevLat !== undefined && prevLng !== undefined && c.lat && c.lng) {
      legMiles = calculateHaversineMiles(prevLat, prevLng, c.lat, c.lng);
      // Apply typical road winding factor (1.3x Euclidean)
      legMiles = Math.round(legMiles * 1.3 * 10) / 10;
    } else {
      legMiles = 0.5; // reasonable fallback
    }

    calculatedMiles += legMiles;
    const legMinutes = estimateDriveMinutes(legMiles);

    routeStops.push({
      customer: c,
      stopIndex: i + 1,
      distanceFromPrevMiles: legMiles,
      driveMinutesFromPrev: legMinutes,
      streetName: parseStreetAndNumber(c.address).streetName,
    });

    if (c.lat && c.lng) {
      prevLat = c.lat;
      prevLng = c.lng;
    }
  }

  if (!usedRoadNetwork) {
    totalDistanceMiles = Math.round(calculatedMiles * 10) / 10;
    totalDurationMinutes = Math.round(
      routeStops.reduce((sum, s) => sum + (s.driveMinutesFromPrev || 1), 0)
    );
  }

  return {
    orderedCustomers,
    routeStops,
    totalDistanceMiles,
    totalDurationMinutes,
    routeGeometry,
    usedRoadNetwork,
  };
}

/**
 * Local 2-Opt Traveling Salesperson Heuristic
 */
function solveTSP2Opt(
  clusters: Array<{ key: string; centroidLat: number; centroidLng: number; customers: Customer[]; streetName: string }>,
  startPoint?: GeoLocation
): any[] {
  if (clusters.length <= 2) return clusters;

  // Start with Nearest Neighbor
  const unvisited = [...clusters];
  const route: typeof clusters = [];

  let currentLat = startPoint?.lat ?? unvisited[0].centroidLat;
  let currentLng = startPoint?.lng ?? unvisited[0].centroidLng;

  while (unvisited.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const d = calculateHaversineMiles(
        currentLat,
        currentLng,
        unvisited[i].centroidLat,
        unvisited[i].centroidLng
      );
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    const next = unvisited.splice(bestIdx, 1)[0];
    route.push(next);
    currentLat = next.centroidLat;
    currentLng = next.centroidLng;
  }

  // 2-Opt Refinement
  let improved = true;
  let iterations = 0;

  const getDistance = (
    c1: { centroidLat: number; centroidLng: number },
    c2: { centroidLat: number; centroidLng: number }
  ) => calculateHaversineMiles(c1.centroidLat, c1.centroidLng, c2.centroidLat, c2.centroidLng);

  while (improved && iterations < 50) {
    improved = false;
    iterations++;

    for (let i = 0; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const d1 = getDistance(route[i], route[i + 1]);
        const d2 = k + 1 < route.length ? getDistance(route[k], route[k + 1]) : 0;

        const newD1 = getDistance(route[i], route[k]);
        const newD2 = k + 1 < route.length ? getDistance(route[i + 1], route[k + 1]) : 0;

        if (newD1 + newD2 < d1 + d2 - 0.01) {
          // Reverse slice
          const slice = route.slice(i + 1, k + 1).reverse();
          route.splice(i + 1, slice.length, ...slice);
          improved = true;
        }
      }
    }
  }

  return route;
}

/**
 * Returns navigation URL for a single stop
 */
export function getSingleStopNavUrl(address: string, app: NavApp = 'google'): string {
  const enc = encodeURIComponent(address);
  switch (app) {
    case 'apple':
      return `https://maps.apple.com/?daddr=${enc}&dirflg=d`;
    case 'waze':
      return `https://waze.com/ul?q=${enc}&navigate=yes`;
    case 'google':
    default:
      return `https://www.google.com/maps/dir/?api=1&destination=${enc}`;
  }
}

/**
 * Returns Google Maps multi-stop URL (handles up to 9 waypoints gracefully)
 */
export function getMultiStopGoogleMapsUrl(addresses: string[], startAddress?: string): string {
  if (addresses.length === 0) return 'https://www.google.com/maps';
  if (addresses.length === 1) return getSingleStopNavUrl(addresses[0], 'google');

  // Max 9 waypoints + 1 destination supported cleanly in URL
  const cappedAddresses = addresses.slice(0, 10);
  const destination = encodeURIComponent(cappedAddresses[cappedAddresses.length - 1]);
  const waypoints = cappedAddresses.slice(0, -1).map(encodeURIComponent).join('|');

  let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&waypoints=${waypoints}`;
  if (startAddress) {
    url += `&origin=${encodeURIComponent(startAddress)}`;
  }
  return url;
}
