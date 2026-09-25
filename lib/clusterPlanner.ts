import { Customer, FrequencyWeeks } from './types';
import {
  calculateHaversineMiles,
  extractPostcode
} from './routeOptimizer';
import { extractStreetOrArea, addWeeksToDate } from './dateUtils';

export interface FrequencySummary {
  totalActive: number;
  freq2w: number;
  freq4w: number;
  freq6w: number;
  freq8w: number;
  freq12w: number;
}

export interface DayCluster {
  dayIndex: number; // 0, 1, 2...
  dateString: string; // e.g. "2026-10-01"
  dayName: string; // e.g. "Thursday 1 Oct"
  weekdayName: string; // e.g. "Thursday"
  badgeLabel: string; // e.g. "MON", "TUE", "WED", "THU", "FRI"
  roundLabel: string; // e.g. "Mon 28 Sep"
  clusterName: string;
  customers: Customer[];
  totalPrice: number;
  color: string;
  centroidLat: number;
  centroidLng: number;
  radiusMiles: number;
  frequencyCounts: {
    twoWeekly: number;
    fourWeekly: number;
    eightWeekly: number;
    other: number;
  };
}

export const CLUSTER_COLORS = [
  '#0284c7', // Sky Blue
  '#10b981', // Emerald Green
  '#f59e0b', // Amber Orange
  '#8b5cf6', // Violet Purple
  '#ec4899', // Pink / Rose
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#6366f1', // Indigo
  '#d97706', // Warm Amber
  '#0d9488', // Teal
];

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Calculates a summary of customer frequencies across an active customer set.
 */
export function getFrequencySummary(customers: Customer[]): FrequencySummary {
  const active = customers.filter((c) => c && c.status !== 'paused');
  let freq2w = 0,
    freq4w = 0,
    freq6w = 0,
    freq8w = 0,
    freq12w = 0;

  active.forEach((c) => {
    const f = c.frequencyWeeks || 4;
    if (f === 2) freq2w++;
    else if (f === 4) freq4w++;
    else if (f === 6) freq6w++;
    else if (f === 8) freq8w++;
    else if (f === 12) freq12w++;
    else freq4w++;
  });

  return {
    totalActive: active.length,
    freq2w,
    freq4w,
    freq6w,
    freq8w,
    freq12w,
  };
}

/**
 * Calculates approximate geographic distance between two customers in miles.
 */
export function getCustomerDistanceMiles(c1: Customer, c2: Customer): number {
  if (c1.id === c2.id) return 0;

  const hasCoords1 = Boolean(c1.lat && c1.lng && c1.lat !== 0 && c1.lng !== 0);
  const hasCoords2 = Boolean(c2.lat && c2.lng && c2.lat !== 0 && c2.lng !== 0);

  if (hasCoords1 && hasCoords2) {
    return calculateHaversineMiles(c1.lat!, c1.lng!, c2.lat!, c2.lng!);
  }

  // Fallback: Street and Postcode distance heuristic
  const street1 = extractStreetOrArea(c1.address).toLowerCase();
  const street2 = extractStreetOrArea(c2.address).toLowerCase();
  if (street1 && street2 && street1 === street2) {
    return 0.05; // Exact same street!
  }

  const pc1 = extractPostcode(c1.address);
  const pc2 = extractPostcode(c2.address);
  if (pc1 && pc2) {
    if (pc1 === pc2) return 0.15; // Same exact postcode unit
    const out1 = pc1.split(' ')[0];
    const out2 = pc2.split(' ')[0];
    if (out1 === out2) return 0.75; // Same outward district
  }

  return 3.0; // Different area
}

/**
 * Generates an array of real working dates across the cleaner's selected days of the week.
 */
export function getWorkingDatesSequence(
  startDateString: string,
  count: number,
  workingDays: number[] = [1, 2, 3, 4, 5] // Default: Monday to Friday
): string[] {
  const [startY, startM, startD] = startDateString.split('-').map(Number);
  const curDate = new Date(startY, startM - 1, startD);
  const dates: string[] = [];

  // If start date is not a working day, advance to the first working day
  let safety = 0;
  while (!workingDays.includes(curDate.getDay()) && safety < 14) {
    curDate.setDate(curDate.getDate() + 1);
    safety++;
  }

  safety = 0;
  while (dates.length < count && safety < 100) {
    if (workingDays.includes(curDate.getDay())) {
      const y = curDate.getFullYear();
      const m = String(curDate.getMonth() + 1).padStart(2, '0');
      const d = String(curDate.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
    }
    curDate.setDate(curDate.getDate() + 1);
    safety++;
  }

  return dates;
}

export interface ClusterOptions {
  startDateString: string;
  numberOfRounds?: number; // e.g. 5 days, 8 days, 10 days
  workingDays?: number[]; // e.g. [1, 2, 3, 4, 5] for Mon-Fri
  frequencyFilter?: number | 'all';
}

/**
 * Automatically groups active customers into geographic proximity clusters and assigns
 * each cluster to a distinct working day of the week (e.g. Monday, Tuesday, Wednesday...).
 */
export function clusterCustomersByProximity(
  customers: Customer[],
  options: ClusterOptions
): DayCluster[] {
  let active = customers.filter((c) => c && c.status !== 'paused');
  if (active.length === 0) return [];

  // Apply optional frequency filter
  if (options.frequencyFilter && options.frequencyFilter !== 'all') {
    const targetFreq = Number(options.frequencyFilter);
    active = active.filter((c) => (c.frequencyWeeks || 4) === targetFreq);
    if (active.length === 0) return [];
  }

  const workingDays =
    Array.isArray(options.workingDays) && options.workingDays.length > 0
      ? options.workingDays
      : [1, 2, 3, 4, 5]; // Default Mon to Fri

  // Determine K (number of distinct daily rounds)
  // Default to number of working days in a week (e.g. 5 days for Mon-Fri), or user choice
  const defaultRounds = Math.min(workingDays.length, active.length);
  const k = Math.min(Math.max(1, options.numberOfRounds || defaultRounds), active.length);

  // 1. Group customers on the exact same street/postcode into Micro-Groups so neighbors NEVER get split
  const streetGroupMap = new Map<string, Customer[]>();
  active.forEach((c) => {
    const streetKey = `${extractStreetOrArea(c.address).toLowerCase()}_${(extractPostcode(c.address) || '').split(' ')[0]}`;
    if (!streetGroupMap.has(streetKey)) {
      streetGroupMap.set(streetKey, []);
    }
    streetGroupMap.get(streetKey)!.push(c);
  });

  const microGroups = Array.from(streetGroupMap.values());

  // 2. Pick K diverse seeds using K-Means++ furthest-point heuristic on groups
  // Representative coordinates for each micro-group
  const groupCentroids = microGroups.map((group) => {
    let sLat = 0,
      sLng = 0,
      cCount = 0;
    group.forEach((c) => {
      if (c.lat && c.lng) {
        sLat += c.lat;
        sLng += c.lng;
        cCount++;
      }
    });
    return {
      lat: cCount > 0 ? sLat / cCount : 0,
      lng: cCount > 0 ? sLng / cCount : 0,
      repCustomer: group[0],
      group,
    };
  });

  const seeds: (typeof groupCentroids)[0][] = [groupCentroids[0]];
  while (seeds.length < k && seeds.length < groupCentroids.length) {
    let bestCandidate = groupCentroids[0];
    let maxDist = -1;

    for (const gc of groupCentroids) {
      if (seeds.includes(gc)) continue;
      let minDistToSeed = Infinity;
      for (const s of seeds) {
        const d = getCustomerDistanceMiles(gc.repCustomer, s.repCustomer);
        if (d < minDistToSeed) minDistToSeed = d;
      }

      if (minDistToSeed > maxDist) {
        maxDist = minDistToSeed;
        bestCandidate = gc;
      }
    }

    seeds.push(bestCandidate);
  }

  // 3. Assign groups to clusters with capacity balancing
  const clusterBuckets: Customer[][] = Array.from({ length: k }, () => []);
  const unassignedGroups = [...groupCentroids];

  // Assign seeds first
  seeds.forEach((seed, idx) => {
    clusterBuckets[idx].push(...seed.group);
    const uIdx = unassignedGroups.indexOf(seed);
    if (uIdx !== -1) unassignedGroups.splice(uIdx, 1);
  });

  const targetPerCluster = Math.ceil(active.length / k);

  while (unassignedGroups.length > 0) {
    let bestGroupIdx = -1;
    let bestClusterIdx = -1;
    let bestDist = Infinity;

    for (let i = 0; i < unassignedGroups.length; i++) {
      const g = unassignedGroups[i];

      for (let cIdx = 0; cIdx < k; cIdx++) {
        // Soft capacity constraint so days stay reasonably balanced
        if (clusterBuckets[cIdx].length >= targetPerCluster + 3 && unassignedGroups.length > k - cIdx) {
          continue;
        }

        // Average distance to customers in this cluster
        let clusterDist = 0;
        for (const member of clusterBuckets[cIdx]) {
          clusterDist += getCustomerDistanceMiles(g.repCustomer, member);
        }
        clusterDist /= Math.max(1, clusterBuckets[cIdx].length);

        if (clusterDist < bestDist) {
          bestDist = clusterDist;
          bestGroupIdx = i;
          bestClusterIdx = cIdx;
        }
      }
    }

    if (bestGroupIdx === -1 || bestClusterIdx === -1) {
      // Fallback: assign to smallest cluster
      let minCluster = 0;
      for (let cIdx = 1; cIdx < k; cIdx++) {
        if (clusterBuckets[cIdx].length < clusterBuckets[minCluster].length) {
          minCluster = cIdx;
        }
      }
      clusterBuckets[minCluster].push(...unassignedGroups.pop()!.group);
    } else {
      clusterBuckets[bestClusterIdx].push(...unassignedGroups[bestGroupIdx].group);
      unassignedGroups.splice(bestGroupIdx, 1);
    }
  }

  // 4. Generate real working dates across selected weekdays (Monday, Tuesday, Wednesday...)
  const scheduledDates = getWorkingDatesSequence(options.startDateString, k, workingDays);

  const dayClusters: DayCluster[] = [];

  for (let i = 0; i < k; i++) {
    const dateString = scheduledDates[i];
    const [y, m, d] = dateString.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay();
    const weekdayName = WEEKDAY_NAMES[dayOfWeek];
    const badgeLabel = WEEKDAY_SHORT[dayOfWeek];
    const dayName = dateObj.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
    const roundLabel = dateObj.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    // Order cluster members into optimal nearest-neighbor order
    const orderedInCluster = orderClusterTour(clusterBuckets[i]);

    // Frequency counts
    let twoWeekly = 0,
      fourWeekly = 0,
      eightWeekly = 0,
      other = 0;

    orderedInCluster.forEach((c) => {
      const f = c.frequencyWeeks || 4;
      if (f === 2) twoWeekly++;
      else if (f === 4) fourWeekly++;
      else if (f === 8) eightWeekly++;
      else other++;
    });

    // Centroid and radius
    let sumLat = 0,
      sumLng = 0,
      coordCount = 0;
    orderedInCluster.forEach((c) => {
      if (c.lat && c.lng) {
        sumLat += c.lat;
        sumLng += c.lng;
        coordCount++;
      }
    });

    const centroidLat = coordCount > 0 ? sumLat / coordCount : 53.4808;
    const centroidLng = coordCount > 0 ? sumLng / coordCount : -2.2426;

    let maxRadius = 0.5;
    if (coordCount > 0) {
      orderedInCluster.forEach((c) => {
        if (c.lat && c.lng) {
          const dist = calculateHaversineMiles(centroidLat, centroidLng, c.lat, c.lng);
          if (dist > maxRadius) maxRadius = dist;
        }
      });
    }

    // Street area naming
    const streetCounts = new Map<string, number>();
    orderedInCluster.forEach((c) => {
      const street = extractStreetOrArea(c.address);
      streetCounts.set(street, (streetCounts.get(street) || 0) + 1);
    });

    const sortedStreets = Array.from(streetCounts.entries()).sort((a, b) => b[1] - a[1]);
    let clusterName = 'Local Area';
    if (sortedStreets.length > 0) {
      if (sortedStreets.length === 1) {
        clusterName = `${sortedStreets[0][0]} Area`;
      } else {
        clusterName = `${sortedStreets[0][0]} & ${sortedStreets[1][0]}`;
      }
    }

    const totalPrice = orderedInCluster.reduce((sum, c) => sum + (Number(c.price) || 0), 0);

    dayClusters.push({
      dayIndex: i,
      dateString,
      dayName,
      weekdayName,
      badgeLabel,
      roundLabel,
      clusterName,
      customers: orderedInCluster,
      totalPrice,
      color: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
      centroidLat,
      centroidLng,
      radiusMiles: Math.round(maxRadius * 10) / 10,
      frequencyCounts: {
        twoWeekly,
        fourWeekly,
        eightWeekly,
        other,
      },
    });
  }

  return dayClusters;
}

/**
 * Nearest-neighbor greedy tour ordering so stops follow a smooth walking/driving sequence.
 */
function orderClusterTour(customers: Customer[]): Customer[] {
  if (customers.length <= 2) return customers;

  const remaining = [...customers];
  const tour: Customer[] = [remaining.shift()!];

  while (remaining.length > 0) {
    const last = tour[tour.length - 1];
    let bestIdx = 0;
    let minDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = getCustomerDistanceMiles(last, remaining[i]);
      if (d < minDist) {
        minDist = d;
        bestIdx = i;
      }
    }

    tour.push(remaining.splice(bestIdx, 1)[0]);
  }

  return tour;
}
