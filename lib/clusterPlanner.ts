import { Customer } from './types';
import {
  calculateHaversineMiles,
  parseStreetAndNumber,
  extractPostcode
} from './routeOptimizer';
import { extractStreetOrArea, addWeeksToDate } from './dateUtils';

export interface DayCluster {
  dayIndex: number; // 0, 1, 2...
  dateString: string;
  dayName: string;
  clusterName: string;
  customers: Customer[];
  totalPrice: number;
  color: string;
  centroidLat: number;
  centroidLng: number;
  radiusMiles: number;
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

/**
 * Automatically groups active customers into geographic proximity clusters for daily rounds.
 */
export function clusterCustomersByProximity(
  customers: Customer[],
  options: {
    numberOfDays: number;
    startDateString: string;
    skipWeekends?: boolean;
  }
): DayCluster[] {
  const active = customers.filter((c) => c.status !== 'paused');
  if (active.length === 0) return [];

  const k = Math.min(Math.max(1, options.numberOfDays), active.length);
  const targetPerCluster = Math.ceil(active.length / k);

  // 1. Pick K diverse seeds using K-Means++ furthest point strategy
  const seeds: Customer[] = [active[0]];
  while (seeds.length < k) {
    let bestCandidate = active[0];
    let maxDist = -1;

    for (const c of active) {
      if (seeds.includes(c)) continue;
      // Distance to nearest existing seed
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

  // 2. Initialize cluster assignments
  const clusters: Customer[][] = Array.from({ length: k }, () => []);
  const unassigned = [...active];

  // Assign seeds first
  seeds.forEach((seed, idx) => {
    clusters[idx].push(seed);
    const uIdx = unassigned.indexOf(seed);
    if (uIdx !== -1) unassigned.splice(uIdx, 1);
  });

  // Sort remaining customers by how tightly they bind to one seed vs others
  // Capacity constrained assignment
  while (unassigned.length > 0) {
    // Find customer with smallest minimum distance to an eligible cluster
    let bestCustIdx = -1;
    let bestClusterIdx = -1;
    let bestDist = Infinity;

    for (let i = 0; i < unassigned.length; i++) {
      const c = unassigned[i];

      for (let cIdx = 0; cIdx < k; cIdx++) {
        // Soft limit on cluster size to keep days balanced
        const maxCapacity = targetPerCluster + (clusters[cIdx].length >= targetPerCluster ? 1 : 0);
        if (clusters[cIdx].length >= maxCapacity && unassigned.length > k - cIdx) {
          continue;
        }

        // Calculate average distance to customers in this cluster
        let clusterDist = 0;
        for (const member of clusters[cIdx]) {
          clusterDist += getCustomerDistanceMiles(c, member);
        }
        clusterDist /= Math.max(1, clusters[cIdx].length);

        if (clusterDist < bestDist) {
          bestDist = clusterDist;
          bestCustIdx = i;
          bestClusterIdx = cIdx;
        }
      }
    }

    if (bestCustIdx === -1 || bestClusterIdx === -1) {
      // Fallback: assign to smallest cluster
      let minCluster = 0;
      for (let cIdx = 1; cIdx < k; cIdx++) {
        if (clusters[cIdx].length < clusters[minCluster].length) {
          minCluster = cIdx;
        }
      }
      clusters[minCluster].push(unassigned.pop()!);
    } else {
      clusters[bestClusterIdx].push(unassigned[bestCustIdx]);
      unassigned.splice(bestCustIdx, 1);
    }
  }

  // 3. Generate dates starting from startDateString
  const [startY, startM, startD] = options.startDateString.split('-').map(Number);
  const curDate = new Date(startY, startM - 1, startD);

  const dayClusters: DayCluster[] = [];

  for (let i = 0; i < k; i++) {
    // If skipping weekends, advance through Saturday/Sunday
    if (options.skipWeekends !== false) {
      while (curDate.getDay() === 0 || curDate.getDay() === 6) {
        curDate.setDate(curDate.getDate() + 1);
      }
    }

    const y = curDate.getFullYear();
    const m = String(curDate.getMonth() + 1).padStart(2, '0');
    const d = String(curDate.getDate()).padStart(2, '0');
    const dateString = `${y}-${m}-${d}`;
    const dayName = curDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

    // Order customers inside each cluster into optimal nearest-neighbor order
    const clusterMembers = clusters[i];
    const orderedInCluster = orderClusterTour(clusterMembers);

    // Calculate cluster centroid & radius
    let sumLat = 0, sumLng = 0, coordCount = 0;
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

    // Determine representative name based on prominent streets
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

    const totalPrice = orderedInCluster.reduce((sum, c) => sum + c.price, 0);

    dayClusters.push({
      dayIndex: i,
      dateString,
      dayName,
      clusterName,
      customers: orderedInCluster,
      totalPrice,
      color: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
      centroidLat,
      centroidLng,
      radiusMiles: Math.round(maxRadius * 10) / 10,
    });

    // Advance to next day
    curDate.setDate(curDate.getDate() + 1);
  }

  return dayClusters;
}

/**
 * Nearest-neighbor greedy ordering inside a cluster so stops follow a smooth path
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
