import { Customer, NavApp, RouteStop, TravelMode } from './types';

// UK Postcode Regex (standard alphanumeric format)
const UK_POSTCODE_REGEX = /([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})/i;

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
}

export type LocationInput = GeoLocation | { address: string; lat?: number; lng?: number };

export interface RouteOptimizationResult {
  orderedCustomers: Customer[];
  routeStops: RouteStop[];
  totalDistanceMiles: number;
  totalDurationMinutes: number;
  routeGeometry?: [number, number][]; // [lat, lng] points for map polyline
  usedRoadNetwork: boolean;
  travelMode: TravelMode;
  finishPoint?: GeoLocation;
  doorstepDistanceMiles?: number;
  doorstepMinutes?: number;
}

export interface OptimizeTradeRouteOptions {
  travelMode?: TravelMode;
  finishPoint?: LocationInput;
}

export interface StreetCluster {
  key: string;
  streetName: string;
  customers: Customer[];
  centroidLat: number;
  centroidLng: number;
  hasCoords: boolean;
}

/**
 * Extracts UK Postcode from any address string
 */
export function extractPostcode(address?: string | null): string | null {
  if (!address || typeof address !== 'string') return null;
  const match = address.match(UK_POSTCODE_REGEX);
  if (!match) return null;
  const raw = match[0].trim().toUpperCase();
  const clean = raw.replace(/\s+/g, '');
  if (clean.length >= 5) {
    const inward = clean.slice(-3);
    const outward = clean.slice(0, -3);
    return `${outward} ${inward}`;
  }
  return raw;
}

/**
 * Parses house number, street name, and postcode for street-level walking order
 */
export function parseStreetAndNumber(address?: string | null): {
  houseNumber: number | null;
  streetName: string;
  postcode: string | null;
} {
  if (!address || typeof address !== 'string') {
    return { houseNumber: null, streetName: 'Round', postcode: null };
  }

  const postcode = extractPostcode(address);
  let cleanAddress = address;
  if (postcode) {
    cleanAddress = cleanAddress.replace(new RegExp(postcode, 'i'), '').trim();
  }

  cleanAddress = cleanAddress.replace(/,\s*$/, '').trim();
  const parts = cleanAddress.split(',').map((p) => p.trim()).filter(Boolean);
  const firstPart = parts[0] || address;

  const numMatch = firstPart.match(/^(\d+)/);
  const houseNumber = numMatch ? parseInt(numMatch[1], 10) : null;
  const streetName = firstPart.replace(/^\d+[\w-]*\s+/, '').trim() || firstPart;

  return {
    houseNumber,
    streetName: streetName.toLowerCase(),
    postcode,
  };
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
 * Estimates walking minutes from miles (window cleaner walking pace ~3.0 mph with trolley/backpack)
 */
export function estimateWalkMinutes(miles: number): number {
  if (miles <= 0.05) return 1; // Same street / door-to-door
  return Math.max(1, Math.round((miles / 3.0) * 60));
}

/**
 * Estimates driving minutes from miles (averages 22 mph in UK towns/suburbs)
 */
export function estimateDriveMinutes(miles: number): number {
  if (miles <= 0.05) return 1;
  const speedMph = miles > 5 ? 35 : 22;
  return Math.max(1, Math.round((miles / speedMph) * 60));
}

/**
 * Estimates travel minutes based on selected travel mode
 */
export function estimateTravelMinutes(miles: number, travelMode: TravelMode = 'walking'): number {
  return travelMode === 'walking' ? estimateWalkMinutes(miles) : estimateDriveMinutes(miles);
}

/**
 * Resolves coordinates for a single location using internal /api/geocode or postcodes.io
 */
async function resolveSingleLocation(loc?: LocationInput): Promise<GeoLocation | undefined> {
  if (!loc || !loc.address) {
    if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number' && Number.isFinite(loc.lat) && Number.isFinite(loc.lng) && Math.abs(loc.lat) > 0.1) {
      return { lat: loc.lat, lng: loc.lng, address: loc.address };
    }
    return undefined;
  }
  if (loc.lat && loc.lng && Number.isFinite(loc.lat) && Number.isFinite(loc.lng) && Math.abs(loc.lat) > 0.1) {
    return { lat: loc.lat, lng: loc.lng, address: loc.address };
  }

  // 1. Try internal /api/geocode route if running in browser
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(loc.address)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.lat && data.lng) {
          return { lat: data.lat, lng: data.lng, address: loc.address };
        }
      }
    } catch (e) {
      // Fall through to postcodes.io / direct lookup
    }
  }

  // 2. Direct postcodes.io check
  const pc = extractPostcode(loc.address);
  if (pc) {
    try {
      const cleanPc = pc.replace(/\s+/g, '').toUpperCase();
      const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPc)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.result?.latitude && data?.result?.longitude) {
          return { lat: data.result.latitude, lng: data.result.longitude, address: loc.address };
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // 3. Fallback direct Nominatim
  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&q=${encodeURIComponent(
        loc.address
      )}`,
      { headers: { 'User-Agent': 'ClearView-WindowCleaning/2.0' } }
    );
    if (nomRes.ok) {
      const nomData = await nomRes.json();
      if (Array.isArray(nomData) && nomData.length > 0 && nomData[0].lat && nomData[0].lon) {
        return {
          lat: parseFloat(nomData[0].lat),
          lng: parseFloat(nomData[0].lon),
          address: loc.address,
        };
      }
    }
  } catch (e) {
    // ignore
  }

  return undefined;
}

/**
 * Geocodes an array of customers using /api/geocode or postcodes.io batch + fallbacks
 */
export async function geocodeCustomers(
  customers: Customer[],
  startLoc?: LocationInput,
  finishLoc?: LocationInput
): Promise<{
  updatedCustomers: Customer[];
  startLocResolved?: GeoLocation;
  finishLocResolved?: GeoLocation;
}> {
  const updated = [...customers];

  // Resolve start and finish locations first
  const [startLocResolved, finishLocResolved] = await Promise.all([
    resolveSingleLocation(startLoc),
    resolveSingleLocation(finishLoc),
  ]);

  // Batch geocode customers missing coordinates
  const missingAddresses: { index: number; address: string; postcode: string | null }[] = [];
  const postcodesToLookup = new Set<string>();

  for (let i = 0; i < updated.length; i++) {
    const c = updated[i];
    if (!c.lat || !c.lng || !Number.isFinite(c.lat) || Math.abs(c.lat) < 0.1) {
      const pc = extractPostcode(c.address);
      if (pc) postcodesToLookup.add(pc.replace(/\s+/g, '').toUpperCase());
      missingAddresses.push({ index: i, address: c.address, postcode: pc });
    }
  }

  // 1. Batch query api.postcodes.io for postcodes
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
            if (item.result?.latitude && item.result?.longitude) {
              const normalPc = item.query.replace(/\s+/g, '').toUpperCase();
              pcMap.set(normalPc, {
                lat: item.result.latitude,
                lng: item.result.longitude,
              });
            }
          }
        }

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
      }
    } catch (e) {
      console.warn('Postcode batch geocoding error:', e);
    }
  }

  // 2. Query /api/geocode for any customer still missing coordinates
  const stillMissing = updated
    .map((c, idx) => ({ c, idx }))
    .filter(({ c }) => !c.lat || !c.lng || !Number.isFinite(c.lat) || Math.abs(c.lat) < 0.1);

  if (stillMissing.length > 0 && typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: stillMissing.map((m) => m.c.address) }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.results) {
          for (const { idx, c } of stillMissing) {
            const coords = data.results[c.address];
            if (coords?.lat && coords?.lng) {
              updated[idx] = { ...updated[idx], lat: coords.lat, lng: coords.lng };
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return {
    updatedCustomers: updated,
    startLocResolved,
    finishLocResolved,
  };
}

/**
 * Objective Cost Function: Total tour distance + Finish penalty factor (1.6x)
 */
export function calculateTourCost(
  tour: StreetCluster[],
  startPoint?: GeoLocation,
  finishPoint?: GeoLocation,
  finishWeight: number = 1.6
): number {
  if (tour.length === 0) return 0;
  let total = 0;
  let curLat = startPoint?.lat && Math.abs(startPoint.lat) > 0.1 ? startPoint.lat : tour[0].centroidLat;
  let curLng = startPoint?.lng && Math.abs(startPoint.lng) > 0.001 ? startPoint.lng : tour[0].centroidLng;

  for (let i = 0; i < tour.length; i++) {
    const cl = tour[i];
    total += calculateHaversineMiles(curLat, curLng, cl.centroidLat, cl.centroidLng);
    curLat = cl.centroidLat;
    curLng = cl.centroidLng;
  }

  if (finishPoint?.lat && finishPoint?.lng && Math.abs(finishPoint.lat) > 0.1) {
    const distToFinish = calculateHaversineMiles(curLat, curLng, finishPoint.lat, finishPoint.lng);
    total += distToFinish * finishWeight;
  }

  return total;
}

/**
 * Exact Branch-and-Bound / Permutation Solver for N <= 9 clusters
 * Provably guarantees the mathematically absolute optimal sequence.
 */
function solveExactBranchAndBound(
  clusters: StreetCluster[],
  startPoint?: GeoLocation,
  finishPoint?: GeoLocation
): StreetCluster[] {
  const n = clusters.length;
  if (n <= 1) return clusters;

  let bestTour = [...clusters];
  let bestCost = calculateTourCost(bestTour, startPoint, finishPoint, 1.6);

  const visited = new Array(n).fill(false);
  const currentTour: StreetCluster[] = new Array(n);

  const startLat = startPoint?.lat && Math.abs(startPoint.lat) > 0.1 ? startPoint.lat : null;
  const startLng = startPoint?.lng && Math.abs(startPoint.lng) > 0.001 ? startPoint.lng : null;
  const hasFinish = Boolean(finishPoint?.lat && finishPoint?.lng && Math.abs(finishPoint.lat) > 0.1);

  function search(depth: number, prevLat: number, prevLng: number, accumulatedCost: number) {
    // Prune branch early if accumulated distance already exceeds best found
    if (accumulatedCost >= bestCost) return;

    if (depth === n) {
      let finalCost = accumulatedCost;
      if (hasFinish) {
        finalCost += calculateHaversineMiles(prevLat, prevLng, finishPoint!.lat, finishPoint!.lng) * 1.6;
      }
      if (finalCost < bestCost) {
        bestCost = finalCost;
        bestTour = [...currentTour];
      }
      return;
    }

    for (let i = 0; i < n; i++) {
      if (!visited[i]) {
        visited[i] = true;
        currentTour[depth] = clusters[i];
        const leg =
          depth === 0 && startLat === null
            ? 0
            : calculateHaversineMiles(prevLat, prevLng, clusters[i].centroidLat, clusters[i].centroidLng);

        search(depth + 1, clusters[i].centroidLat, clusters[i].centroidLng, accumulatedCost + leg);
        visited[i] = false;
      }
    }
  }

  const initialLat = startLat ?? clusters[0].centroidLat;
  const initialLng = startLng ?? clusters[0].centroidLng;
  search(0, initialLat, initialLng, 0);

  return bestTour;
}

/**
 * Multi-Start Metaheuristic with 2-Opt and Or-Opt for N > 9 clusters
 */
function solveMetaheuristicTSP(
  clusters: StreetCluster[],
  startPoint?: GeoLocation,
  finishPoint?: GeoLocation
): StreetCluster[] {
  const n = clusters.length;
  if (n <= 1) return clusters;

  const hasFinish = Boolean(finishPoint?.lat && finishPoint?.lng && Math.abs(finishPoint.lat) > 0.1);
  const candidates: StreetCluster[][] = [];

  // Restart 1: Backward-from-Doorstep Heuristic
  // Find cluster closest to finish, make it the last stop, and work backward
  if (hasFinish) {
    const unvisited = [...clusters];
    let bestLastIdx = 0;
    let minFinishDist = Infinity;
    for (let i = 0; i < unvisited.length; i++) {
      const d = calculateHaversineMiles(
        unvisited[i].centroidLat,
        unvisited[i].centroidLng,
        finishPoint!.lat,
        finishPoint!.lng
      );
      if (d < minFinishDist) {
        minFinishDist = d;
        bestLastIdx = i;
      }
    }

    const backwardTour: StreetCluster[] = [];
    let cur = unvisited.splice(bestLastIdx, 1)[0];
    backwardTour.push(cur);

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const d = calculateHaversineMiles(cur.centroidLat, cur.centroidLng, unvisited[i].centroidLat, unvisited[i].centroidLng);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }
      cur = unvisited.splice(nearestIdx, 1)[0];
      backwardTour.push(cur);
    }
    // Reverse so the anchor closest to home is at the very end
    candidates.push(backwardTour.reverse());
  }

  // Restart 2: Forward Nearest Neighbor from Start
  {
    const unvisited = [...clusters];
    const forwardTour: StreetCluster[] = [];
    let curLat = startPoint?.lat && Math.abs(startPoint.lat) > 0.1 ? startPoint.lat : unvisited[0].centroidLat;
    let curLng = startPoint?.lng && Math.abs(startPoint.lng) > 0.001 ? startPoint.lng : unvisited[0].centroidLng;

    while (unvisited.length > 0) {
      let bestIdx = 0;
      let bestScore = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const dFromCur = calculateHaversineMiles(curLat, curLng, unvisited[i].centroidLat, unvisited[i].centroidLng);
        let score = dFromCur;
        if (hasFinish && unvisited.length <= 3) {
          const dToFinish = calculateHaversineMiles(
            unvisited[i].centroidLat,
            unvisited[i].centroidLng,
            finishPoint!.lat,
            finishPoint!.lng
          );
          // When nearing end, incentivize moving toward finish
          score += dToFinish * 0.7;
        }
        if (score < bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      const next = unvisited.splice(bestIdx, 1)[0];
      forwardTour.push(next);
      curLat = next.centroidLat;
      curLng = next.centroidLng;
    }
    candidates.push(forwardTour);
  }

  // Restart 3: Cheapest Insertion
  {
    const remaining = [...clusters];
    const insertionTour: StreetCluster[] = [remaining.shift()!];
    if (remaining.length > 0) insertionTour.push(remaining.shift()!);

    while (remaining.length > 0) {
      let bestClusterIdx = 0;
      let bestInsertPos = 0;
      let minCostIncrease = Infinity;

      for (let c = 0; c < remaining.length; c++) {
        const cand = remaining[c];
        for (let pos = 0; pos <= insertionTour.length; pos++) {
          const testTour = [...insertionTour.slice(0, pos), cand, ...insertionTour.slice(pos)];
          const cost = calculateTourCost(testTour, startPoint, finishPoint, 1.6);
          if (cost < minCostIncrease) {
            minCostIncrease = cost;
            bestClusterIdx = c;
            bestInsertPos = pos;
          }
        }
      }

      const inserted = remaining.splice(bestClusterIdx, 1)[0];
      insertionTour.splice(bestInsertPos, 0, inserted);
    }
    candidates.push(insertionTour);
  }

  // Local Search: 2-Opt and Or-Opt on all candidates
  let bestGlobalTour = candidates[0] || clusters;
  let bestGlobalCost = calculateTourCost(bestGlobalTour, startPoint, finishPoint, 1.6);

  for (const cand of candidates) {
    let tour = [...cand];
    let improved = true;
    let iteration = 0;

    while (improved && iteration < 40) {
      improved = false;
      iteration++;

      // 2-Opt Segment Inversion
      for (let i = 0; i < tour.length - 1; i++) {
        for (let k = i + 1; k < tour.length; k++) {
          const newTour = [...tour.slice(0, i), ...tour.slice(i, k + 1).reverse(), ...tour.slice(k + 1)];
          const newCost = calculateTourCost(newTour, startPoint, finishPoint, 1.6);
          if (newCost < bestGlobalCost - 0.005) {
            tour = newTour;
            bestGlobalCost = newCost;
            bestGlobalTour = newTour;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }

      // Or-Opt Relocation (move blocks of length 1 or 2)
      if (!improved) {
        for (let blockSize = 1; blockSize <= 2; blockSize++) {
          for (let i = 0; i <= tour.length - blockSize; i++) {
            const block = tour.slice(i, i + blockSize);
            const remaining = [...tour.slice(0, i), ...tour.slice(i + blockSize)];

            for (let j = 0; j <= remaining.length; j++) {
              const testTour = [...remaining.slice(0, j), ...block, ...remaining.slice(j)];
              const testCost = calculateTourCost(testTour, startPoint, finishPoint, 1.6);
              if (testCost < bestGlobalCost - 0.005) {
                tour = testTour;
                bestGlobalCost = testCost;
                bestGlobalTour = testTour;
                improved = true;
                break;
              }
            }
            if (improved) break;
          }
          if (improved) break;
        }
      }
    }
  }

  return bestGlobalTour;
}

/**
 * Optimizes the sequence of Street Clusters ensuring doorstep finish near home
 */
export function solveOptimalTour(
  clusters: StreetCluster[],
  startPoint?: GeoLocation,
  finishPoint?: GeoLocation
): StreetCluster[] {
  if (clusters.length <= 1) return clusters;

  // Use Exact Branch-and-Bound for <= 9 clusters
  if (clusters.length <= 9) {
    return solveExactBranchAndBound(clusters, startPoint, finishPoint);
  }

  // Use Multi-Start Metaheuristic for > 9 clusters
  return solveMetaheuristicTSP(clusters, startPoint, finishPoint);
}

/**
 * Solves Trade Route Optimization using Street-by-Street Clustering,
 * Exact/Metaheuristic Doorstep TSP, and Sequential OSRM Route Geometry.
 */
export async function optimizeTradeRoute(
  customers: Customer[],
  startPoint?: LocationInput,
  options?: OptimizeTradeRouteOptions
): Promise<RouteOptimizationResult> {
  const travelMode: TravelMode = options?.travelMode || 'walking';
  const rawFinish = options?.finishPoint;

  if (!customers || customers.length === 0) {
    return {
      orderedCustomers: [],
      routeStops: [],
      totalDistanceMiles: 0,
      totalDurationMinutes: 0,
      usedRoadNetwork: false,
      travelMode,
      finishPoint: undefined,
    };
  }

  try {
    // Step 1: Geocode missing coordinates for customers, start depot, and finish home
    const { updatedCustomers, startLocResolved, finishLocResolved } = await geocodeCustomers(
      customers,
      startPoint,
      rawFinish
    );

    const validStart =
      startLocResolved?.lat &&
      startLocResolved?.lng &&
      Number.isFinite(startLocResolved.lat) &&
      Number.isFinite(startLocResolved.lng) &&
      Math.abs(startLocResolved.lat) > 0.1
        ? startLocResolved
        : undefined;

    const validFinish =
      finishLocResolved?.lat &&
      finishLocResolved?.lng &&
      Number.isFinite(finishLocResolved.lat) &&
      Number.isFinite(finishLocResolved.lng) &&
      Math.abs(finishLocResolved.lat) > 0.1
        ? finishLocResolved
        : undefined;

    // Base coordinate anchor to keep unmapped stops in local geography
    const knownCoords = updatedCustomers.filter(
      (c) => typeof c.lat === 'number' && typeof c.lng === 'number' && Number.isFinite(c.lat) && Number.isFinite(c.lng)
    );
    const baseLat = validStart?.lat ?? validFinish?.lat ?? (knownCoords.length > 0 ? knownCoords[0].lat! : 53.339);
    const baseLng = validStart?.lng ?? validFinish?.lng ?? (knownCoords.length > 0 ? knownCoords[0].lng! : -2.738);

    for (let i = 0; i < updatedCustomers.length; i++) {
      if (!updatedCustomers[i].lat || !updatedCustomers[i].lng || !Number.isFinite(updatedCustomers[i].lat)) {
        updatedCustomers[i] = {
          ...updatedCustomers[i],
          lat: baseLat + (i + 1) * 0.0015,
          lng: baseLng + (i + 1) * 0.0015,
        };
      }
    }

    // Step 2: Group customers into Street Clusters
    const clusterMap = new Map<string, Customer[]>();
    for (const c of updatedCustomers) {
      const { streetName, postcode } = parseStreetAndNumber(c.address);
      const clusterKey = postcode || streetName || c.address || c.id;
      if (!clusterMap.has(clusterKey)) {
        clusterMap.set(clusterKey, []);
      }
      clusterMap.get(clusterKey)!.push(c);
    }

    const clusters: StreetCluster[] = [];
    clusterMap.forEach((clusterCustomers, key) => {
      // Natural house number sort initially
      clusterCustomers.sort((a: Customer, b: Customer) => {
        const aInfo = parseStreetAndNumber(a.address);
        const bInfo = parseStreetAndNumber(b.address);
        if (aInfo.houseNumber !== null && bInfo.houseNumber !== null) {
          return aInfo.houseNumber - bInfo.houseNumber;
        }
        return (a.address || '').localeCompare(b.address || '');
      });

      const withCoords = clusterCustomers.filter((c: Customer) => Number.isFinite(c.lat) && Number.isFinite(c.lng));
      const hasCoords = withCoords.length > 0;
      const avgLat = hasCoords
        ? withCoords.reduce((s: number, c: Customer) => s + (c.lat || 0), 0) / withCoords.length
        : baseLat;
      const avgLng = hasCoords
        ? withCoords.reduce((s: number, c: Customer) => s + (c.lng || 0), 0) / withCoords.length
        : baseLng;

      clusters.push({
        key,
        streetName: parseStreetAndNumber(clusterCustomers[0]?.address).streetName,
        customers: clusterCustomers,
        centroidLat: avgLat,
        centroidLng: avgLng,
        hasCoords,
      });
    });

    // Step 3: Solve Global Optimal Tour between Street Clusters
    const orderedClusters = solveOptimalTour(clusters, validStart, validFinish);

    // Step 4: Traverse customer houses within each cluster in optimal entry/exit walking order
    const orderedCustomers: Customer[] = [];
    let currentLat = validStart?.lat ?? orderedClusters[0]?.centroidLat ?? baseLat;
    let currentLng = validStart?.lng ?? orderedClusters[0]?.centroidLng ?? baseLng;

    for (let cIdx = 0; cIdx < orderedClusters.length; cIdx++) {
      const cluster = orderedClusters[cIdx];
      const custs = [...cluster.customers];

      if (custs.length > 1) {
        // Check if reversing the street order brings the first house closer to current location
        const firstDist = calculateHaversineMiles(currentLat, currentLng, custs[0].lat || 0, custs[0].lng || 0);
        const lastDist = calculateHaversineMiles(
          currentLat,
          currentLng,
          custs[custs.length - 1].lat || 0,
          custs[custs.length - 1].lng || 0
        );

        if (lastDist < firstDist) {
          custs.reverse();
        }
      }

      orderedCustomers.push(...custs);
      const lastCust = custs[custs.length - 1];
      if (lastCust.lat && lastCust.lng) {
        currentLat = lastCust.lat;
        currentLng = lastCust.lng;
      }
    }

    // Step 5: Sequential OSRM Footpath / Road Routing (using OSRM /route/v1 with our optimal sequence)
    let routeGeometry: [number, number][] | undefined;
    let totalDistanceMiles = 0;
    let totalDurationMinutes = 0;
    let usedRoadNetwork = false;

    // Collect all points in exact sequence: [Start?, ...orderedCustomers, Finish?]
    const sequentialWaypoints = [
      ...(validStart ? [{ lat: validStart.lat, lng: validStart.lng }] : []),
      ...orderedCustomers.map((c) => ({ lat: c.lat!, lng: c.lng! })),
      ...(validFinish ? [{ lat: validFinish.lat, lng: validFinish.lng }] : []),
    ];

    if (sequentialWaypoints.length >= 2 && sequentialWaypoints.length <= 40) {
      try {
        const coordsString = sequentialWaypoints
          .map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`)
          .join(';');

        const profile = travelMode === 'walking' ? 'foot' : 'driving';
        const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${coordsString}?overview=full&geometries=geojson`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(osrmUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.code === 'Ok' && data.routes?.[0]) {
            const route = data.routes[0];
            totalDistanceMiles = Math.round(route.distance * 0.000621371 * 10) / 10;
            totalDurationMinutes = Math.round(route.duration / 60);

            if (route.geometry?.coordinates) {
              routeGeometry = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
            }
            usedRoadNetwork = true;
          }
        }
      } catch (e) {
        console.warn('Sequential OSRM route fetch fallback:', e);
      }
    }

    // Step 6: Build turn-by-turn RouteStop list
    const routeStops: RouteStop[] = [];
    let prevLat = validStart?.lat;
    let prevLng = validStart?.lng;
    let calculatedMiles = 0;

    for (let i = 0; i < orderedCustomers.length; i++) {
      const c = orderedCustomers[i];
      let legMiles = 0;

      if (prevLat !== undefined && prevLng !== undefined && c.lat && c.lng) {
        legMiles = calculateHaversineMiles(prevLat, prevLng, c.lat, c.lng);
        legMiles = Math.round(legMiles * 1.25 * 10) / 10; // road curvature factor
      } else {
        legMiles = i === 0 ? 0.4 : 0.2;
      }

      calculatedMiles += legMiles;
      const legMinutes = estimateTravelMinutes(legMiles, travelMode);

      routeStops.push({
        customer: c,
        stopIndex: i + 1,
        distanceFromPrevMiles: legMiles,
        driveMinutesFromPrev: legMinutes,
        travelMinutesFromPrev: legMinutes,
        streetName: parseStreetAndNumber(c.address).streetName,
      });

      if (c.lat && c.lng) {
        prevLat = c.lat;
        prevLng = c.lng;
      }
    }

    if (!usedRoadNetwork) {
      totalDistanceMiles = Math.round(calculatedMiles * 10) / 10;
      totalDurationMinutes = routeStops.reduce((sum, s) => sum + (s.travelMinutesFromPrev || 2), 0);
    }

    // Realistic walking floor
    if (travelMode === 'walking') {
      const stopSumMinutes = routeStops.reduce((sum, s) => sum + (s.travelMinutesFromPrev || 1), 0);
      totalDurationMinutes = Math.max(totalDurationMinutes, stopSumMinutes, estimateWalkMinutes(totalDistanceMiles));
    }

    // Step 7: Calculate final doorstep distance from last customer to home
    let doorstepDistanceMiles: number | undefined;
    let doorstepMinutes: number | undefined;

    if (validFinish && orderedCustomers.length > 0) {
      const lastCust = orderedCustomers[orderedCustomers.length - 1];
      if (lastCust.lat && lastCust.lng) {
        const directMiles = calculateHaversineMiles(lastCust.lat, lastCust.lng, validFinish.lat, validFinish.lng);
        doorstepDistanceMiles = Math.round(directMiles * 1.25 * 10) / 10;
        doorstepMinutes = estimateTravelMinutes(doorstepDistanceMiles, travelMode);
      }
    }

    return {
      orderedCustomers,
      routeStops,
      totalDistanceMiles,
      totalDurationMinutes,
      routeGeometry,
      usedRoadNetwork,
      travelMode,
      finishPoint: validFinish,
      doorstepDistanceMiles,
      doorstepMinutes,
    };
  } catch (err) {
    console.error('Safe fallback inside optimizeTradeRoute:', err);
    const fallbackStops: RouteStop[] = customers.map((c, i) => {
      const legDist = i === 0 ? 0.4 : 0.2;
      const legTime = estimateTravelMinutes(legDist, travelMode);
      return {
        customer: c,
        stopIndex: i + 1,
        distanceFromPrevMiles: legDist,
        driveMinutesFromPrev: legTime,
        travelMinutesFromPrev: legTime,
        streetName: parseStreetAndNumber(c.address).streetName,
      };
    });
    return {
      orderedCustomers: customers,
      routeStops: fallbackStops,
      totalDistanceMiles: Math.round(fallbackStops.reduce((sum, s) => sum + (s.distanceFromPrevMiles || 0), 0) * 10) / 10,
      totalDurationMinutes: fallbackStops.reduce((sum, s) => sum + (s.travelMinutesFromPrev || 2), 0),
      usedRoadNetwork: false,
      travelMode,
      finishPoint: rawFinish?.lat && rawFinish?.lng ? { lat: rawFinish.lat, lng: rawFinish.lng, address: rawFinish.address } : undefined,
    };
  }
}

/**
 * Returns navigation URL for a single stop
 */
export function getSingleStopNavUrl(
  address: string,
  app: NavApp = 'google',
  travelMode: TravelMode = 'walking'
): string {
  const enc = encodeURIComponent(address || 'UK');
  const googleTravel = travelMode === 'walking' ? '&travelmode=walking' : '&travelmode=driving';
  const appleTravel = travelMode === 'walking' ? '&dirflg=w' : '&dirflg=d';

  switch (app) {
    case 'apple':
      return `https://maps.apple.com/?daddr=${enc}${appleTravel}`;
    case 'waze':
      return travelMode === 'walking'
        ? `https://www.google.com/maps/dir/?api=1&destination=${enc}&travelmode=walking`
        : `https://waze.com/ul?q=${enc}&navigate=yes`;
    case 'google':
    default:
      return `https://www.google.com/maps/dir/?api=1&destination=${enc}${googleTravel}`;
  }
}

/**
 * Returns Google Maps multi-stop URL (handles up to 9 waypoints gracefully)
 */
export function getMultiStopGoogleMapsUrl(
  addresses: string[],
  startAddress?: string,
  travelMode: TravelMode = 'walking'
): string {
  if (!addresses || addresses.length === 0) return 'https://www.google.com/maps';
  if (addresses.length === 1) return getSingleStopNavUrl(addresses[0], 'google', travelMode);

  const cappedAddresses = addresses.slice(0, 10);
  const destination = encodeURIComponent(cappedAddresses[cappedAddresses.length - 1]);
  const waypoints = cappedAddresses.slice(0, -1).map(encodeURIComponent).join('|');
  const travelParam = travelMode === 'walking' ? '&travelmode=walking' : '&travelmode=driving';

  let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&waypoints=${waypoints}${travelParam}`;
  if (startAddress && startAddress !== 'My Current GPS Location') {
    url += `&origin=${encodeURIComponent(startAddress)}`;
  }
  return url;
}
