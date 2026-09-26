import { NextRequest, NextResponse } from 'next/server';

// Server-side route cache for instant repeated round geometry
const routeCache = new Map<
  string,
  {
    totalDistanceMiles: number;
    totalDurationMinutes: number;
    routeGeometry: [number, number][];
    usedRoadNetwork: boolean;
  }
>();

interface SubRouteResult {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][]; // [lat, lng]
}

async function fetchOsrmSegment(
  waypoints: Array<{ lat: number; lng: number }>,
  travelMode: 'walking' | 'driving'
): Promise<SubRouteResult | null> {
  const coordsString = waypoints
    .map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`)
    .join(';');

  const candidateUrls: string[] = [];
  if (travelMode === 'walking') {
    candidateUrls.push(
      `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${coordsString}?overview=full&geometries=geojson`,
      `https://router.project-osrm.org/route/v1/foot/${coordsString}?overview=full&geometries=geojson`
    );
  } else {
    candidateUrls.push(
      `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordsString}?overview=full&geometries=geojson`,
      `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`
    );
  }

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'ClearViewApp/2.1 (contact@clearview-window-cleaning.app)',
        },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && data.routes?.[0]) {
          const route = data.routes[0];
          const coords: [number, number][] = route.geometry?.coordinates
            ? route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]])
            : [];
          return {
            distanceMeters: route.distance || 0,
            durationSeconds: route.duration || 0,
            coordinates: coords,
          };
        }
      }
    } catch {
      // try next candidate
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const waypoints: Array<{ lat: number; lng: number }> = Array.isArray(body.waypoints)
      ? body.waypoints
      : [];
    const travelMode = body.travelMode === 'driving' ? 'driving' : 'walking';

    if (waypoints.length < 2) {
      return NextResponse.json({ error: 'At least 2 waypoints required' }, { status: 400 });
    }

    const coordsKey = waypoints
      .map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`)
      .join(';');

    const cacheKey = `${travelMode}:${coordsKey}`;
    if (routeCache.has(cacheKey)) {
      return NextResponse.json(routeCache.get(cacheKey));
    }

    // Split waypoints into overlapping chunks of max 25 to respect OSRM url limitations
    const chunkSize = 25;
    const chunks: Array<Array<{ lat: number; lng: number }>> = [];
    let startIdx = 0;
    while (startIdx < waypoints.length - 1) {
      const endIdx = Math.min(startIdx + chunkSize, waypoints.length);
      chunks.push(waypoints.slice(startIdx, endIdx));
      startIdx = endIdx - 1;
    }

    const results = await Promise.all(
      chunks.map((chunk) => fetchOsrmSegment(chunk, travelMode))
    );

    // If all chunks succeeded, combine them
    if (results.every((r) => r !== null)) {
      let combinedDistanceMeters = 0;
      let combinedDurationSeconds = 0;
      const combinedGeometry: [number, number][] = [];

      for (let i = 0; i < results.length; i++) {
        const res = results[i]!;
        combinedDistanceMeters += res.distanceMeters;
        combinedDurationSeconds += res.durationSeconds;
        // Avoid duplicate point at chunk junction
        const toAdd = i === 0 ? res.coordinates : res.coordinates.slice(1);
        combinedGeometry.push(...toAdd);
      }

      const totalDistanceMiles = Math.round(combinedDistanceMeters * 0.000621371 * 10) / 10;
      const totalDurationMinutes =
        travelMode === 'walking'
          ? Math.round(combinedDurationSeconds / 60) || Math.max(1, Math.round((totalDistanceMiles / 3.0) * 60))
          : Math.round(combinedDurationSeconds / 60) || Math.max(1, Math.round((totalDistanceMiles / 22.0) * 60));

      const payload = {
        totalDistanceMiles,
        totalDurationMinutes,
        routeGeometry: combinedGeometry,
        usedRoadNetwork: true,
      };

      routeCache.set(cacheKey, payload);
      return NextResponse.json(payload);
    }

    return NextResponse.json({ error: 'Routing engine unreachable' }, { status: 502 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
