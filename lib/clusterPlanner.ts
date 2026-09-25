import { Customer, FrequencyWeeks } from './types';
import {
  calculateHaversineMiles,
  extractPostcode
} from './routeOptimizer';
import { extractStreetOrArea, addWeeksToDate } from './dateUtils';

export type PlannerMode = '4week_cycle' | 'daily_split';
export type FrequencyGrouping = 'harmonized' | 'by_frequency';

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
  weekNumber: number; // 1, 2, 3, 4
  roundLabel: string; // e.g. "Week 1" or "Day 1"
  dateString: string;
  dayName: string;
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
];

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
 * Calculates approximate geographic distance between two customers.
 * Uses exact GPS coordinates if available, otherwise heuristics based on street & postcode.
 */
function getCustomerDistanceMiles(c1: Customer, c2: Customer): number {
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
    return 0.05; // Same street!
  }

  const pc1 = extractPostcode(c1.address);
  const pc2 = extractPostcode(c2.address);
  if (pc1 && pc2) {
    if (pc1 === pc2) return 0.15; // Same exact postcode unit
    const out1 = pc1.split(' ')[0];
    const out2 = pc2.split(' ')[0];
    if (out1 === out2) return 0.75; // Same outward postcode district
  }

  return 3.0; // Different area
}

export interface ClusterOptions {
  plannerMode?: PlannerMode; // '4week_cycle' (default) or 'daily_split'
  numberOfDays?: number; // 2 to 5 days in a week (for daily_split) or total rounds (2 to 8)
  startDateString: string;
  skipWeekends?: boolean;
  frequencyGrouping?: FrequencyGrouping; // 'harmonized' (default) or 'by_frequency'
  frequencyFilter?: number | 'all';
}

/**
 * Automatically groups active customers into geographic proximity clusters and frequency-aware rounds.
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

  const mode = options.plannerMode || '4week_cycle';
  const frequencyGrouping = options.frequencyGrouping || 'harmonized';

  // Determine K (number of distinct rounds / clusters)
  let k = 4;
  if (mode === 'daily_split') {
    k = Math.min(Math.max(1, options.numberOfDays || 3), active.length);
  } else {
    // 4-week cycle: default to 4 rounds (Week 1, Week 2, Week 3, Week 4)
    // or options.numberOfDays if specified (e.g. 2 to 8 rounds)
    k = Math.min(Math.max(1, options.numberOfDays || 4), active.length);
  }

  // 1. Separate customers by frequency if harmonizing
  // 4w & 8w form the primary structural area rounds across the cycle
  const primaryCustomers: Customer[] = [];
  const biweeklyCustomers: Customer[] = [];

  if (frequencyGrouping === 'harmonized' && mode === '4week_cycle') {
    active.forEach((c) => {
      const freq = c.frequencyWeeks || 4;
      if (freq === 2) {
        biweeklyCustomers.push(c);
      } else {
        primaryCustomers.push(c);
      }
    });
  } else {
    primaryCustomers.push(...active);
  }

  // Cluster assignment container
  const clusterBuckets: Customer[][] = Array.from({ length: k }, () => []);

  // If primary customers exist, cluster them across the K rounds
  const poolToCluster = primaryCustomers.length > 0 ? primaryCustomers : active;
  const targetPerCluster = Math.ceil(poolToCluster.length / k);

  // Pick K diverse seeds using K-Means++ furthest point strategy
  const seeds: Customer[] = [poolToCluster[0]];
  while (seeds.length < k && seeds.length < poolToCluster.length) {
    let bestCandidate = poolToCluster[0];
    let maxDist = -1;

    for (const c of poolToCluster) {
      if (seeds.includes(c)) continue;
      let minDistToSeed = Infinity;
      for (const s of seeds) {
        const d = getCustomerDistanceMiles(c, s);
        if (d < minDistToSeed) minDistToSeed = d;
      }

      if (minDistToSeed > maxDist) {
        maxDist = minDistToSeed;
        bestCandidate = c;
      }
    }

    seeds.push(bestCandidate);
  }

  const unassigned = [...poolToCluster];
  seeds.forEach((seed, idx) => {
    clusterBuckets[idx].push(seed);
    const uIdx = unassigned.indexOf(seed);
    if (uIdx !== -1) unassigned.splice(uIdx, 1);
  });

  // Assign remaining primary customers with capacity constraints
  while (unassigned.length > 0) {
    let bestCustIdx = -1;
    let bestClusterIdx = -1;
    let bestDist = Infinity;

    for (let i = 0; i < unassigned.length; i++) {
      const c = unassigned[i];

      for (let cIdx = 0; cIdx < k; cIdx++) {
        const maxCapacity = targetPerCluster + (clusterBuckets[cIdx].length >= targetPerCluster ? 1 : 0);
        if (clusterBuckets[cIdx].length >= maxCapacity && unassigned.length > k - cIdx) {
          continue;
        }

        let clusterDist = 0;
        for (const member of clusterBuckets[cIdx]) {
          clusterDist += getCustomerDistanceMiles(c, member);
        }
        clusterDist /= Math.max(1, clusterBuckets[cIdx].length);

        if (clusterDist < bestDist) {
          bestDist = clusterDist;
          bestCustIdx = i;
          bestClusterIdx = cIdx;
        }
      }
    }

    if (bestCustIdx === -1 || bestClusterIdx === -1) {
      let minCluster = 0;
      for (let cIdx = 1; cIdx < k; cIdx++) {
        if (clusterBuckets[cIdx].length < clusterBuckets[minCluster].length) {
          minCluster = cIdx;
        }
      }
      clusterBuckets[minCluster].push(unassigned.pop()!);
    } else {
      clusterBuckets[bestClusterIdx].push(unassigned[bestCustIdx]);
      unassigned.splice(bestCustIdx, 1);
    }
  }

  // 2. Harmonize 2-weekly customers into their nearest geographic area round
  // In a 4-week cycle, placing them in Week 1 or Week 2 means their +2w recurrence
  // automatically aligns with Week 3 or Week 4!
  if (biweeklyCustomers.length > 0) {
    biweeklyCustomers.forEach((c) => {
      let bestClusterIdx = 0;
      let minAvgDist = Infinity;

      for (let cIdx = 0; cIdx < k; cIdx++) {
        if (clusterBuckets[cIdx].length === 0) continue;
        let avgDist = 0;
        for (const member of clusterBuckets[cIdx]) {
          avgDist += getCustomerDistanceMiles(c, member);
        }
        avgDist /= clusterBuckets[cIdx].length;

        if (avgDist < minAvgDist) {
          minAvgDist = avgDist;
          bestClusterIdx = cIdx;
        }
      }

      clusterBuckets[bestClusterIdx].push(c);
    });
  }

  // 3. Generate scheduled dates
  const [startY, startM, startD] = options.startDateString.split('-').map(Number);
  const baseDate = new Date(startY, startM - 1, startD);

  const dayClusters: DayCluster[] = [];

  for (let i = 0; i < k; i++) {
    const curDate = new Date(baseDate);

    if (mode === '4week_cycle') {
      // In 4-week cycle mode:
      // If k === 4, each round is 1 week apart (Week 1 = Day 0, Week 2 = +7 days, Week 3 = +14 days, Week 4 = +21 days)
      // If k > 4, distribute across weeks (e.g. 2 days per week)
      if (k === 4) {
        curDate.setDate(curDate.getDate() + i * 7);
      } else {
        const weekIdx = Math.floor(i / Math.ceil(k / 4));
        const dayInWeekIdx = i % Math.ceil(k / 4);
        curDate.setDate(curDate.getDate() + weekIdx * 7 + dayInWeekIdx);
      }
    } else {
      // In daily split mode: consecutive workdays in a single week
      let daysAdded = 0;
      let targetSteps = i;
      while (targetSteps > 0) {
        curDate.setDate(curDate.getDate() + 1);
        if (options.skipWeekends !== false && (curDate.getDay() === 0 || curDate.getDay() === 6)) {
          // Weekend, skip
          continue;
        }
        targetSteps--;
      }
    }

    // Skip weekend if landing on Sat/Sun
    if (options.skipWeekends !== false) {
      while (curDate.getDay() === 0 || curDate.getDay() === 6) {
        curDate.setDate(curDate.getDate() + 1);
      }
    }

    const y = curDate.getFullYear();
    const m = String(curDate.getMonth() + 1).padStart(2, '0');
    const d = String(curDate.getDate()).padStart(2, '0');
    const dateString = `${y}-${m}-${d}`;
    const dayName = curDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });

    const weekNumber = mode === '4week_cycle' ? (k === 4 ? i + 1 : Math.floor(i / 2) + 1) : 1;
    const roundLabel = mode === '4week_cycle' ? `Week ${weekNumber}` : `Day ${i + 1}`;

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
      weekNumber,
      roundLabel,
      dateString,
      dayName,
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
 * Nearest-neighbor greedy ordering inside a cluster so stops follow a smooth driving/walking path
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
