import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for fast geocode resolution
const geocodeCache = new Map<string, { lat: number; lng: number }>();

// Regional town/city centroid fallbacks across the UK North West & general UK
const REGIONAL_FALLBACKS: Record<string, { lat: number; lng: number }> = {
  'runcorn': { lat: 53.339, lng: -2.738 },
  'old town runcorn': { lat: 53.342, lng: -2.735 },
  'higher runcorn': { lat: 53.333, lng: -2.747 },
  'weston': { lat: 53.324, lng: -2.745 },
  'halton': { lat: 53.333, lng: -2.698 },
  'widnes': { lat: 53.364, lng: -2.729 },
  'frodsham': { lat: 53.295, lng: -2.723 },
  'helsby': { lat: 53.277, lng: -2.766 },
  'warrington': { lat: 53.390, lng: -2.597 },
  'chester': { lat: 53.193, lng: -2.893 },
  'liverpool': { lat: 53.408, lng: -2.991 },
  'manchester': { lat: 53.480, lng: -2.242 },
};

function extractUkPostcode(text: string): string | null {
  if (!text) return null;
  const match = text.match(/\b([A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2})\b/i);
  return match ? match[1].trim() : null;
}

function extractUkOutcode(text: string): string | null {
  if (!text) return null;
  const match = text.match(/\b([A-Z]{1,2}[0-9][A-Z0-9]?)\b/i);
  return match ? match[1].trim().toUpperCase() : null;
}

/**
 * Resolves postcode coordinates via postcodes.io (standard, terminated, or outcode)
 */
async function resolvePostcodeCoords(cleanPc: string): Promise<{ lat: number; lng: number } | null> {
  const pc = cleanPc.replace(/\s+/g, '').toUpperCase();
  try {
    // 1. Standard lookup
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
    const data = await res.json();
    if (res.ok && data?.result?.latitude && data?.result?.longitude) {
      return { lat: data.result.latitude, lng: data.result.longitude };
    }
    // Check if 404 response body contains terminated coordinates
    if (data?.terminated?.latitude && data?.terminated?.longitude) {
      return { lat: data.terminated.latitude, lng: data.terminated.longitude };
    }
  } catch {}

  try {
    // 2. Terminated postcodes endpoint
    const termRes = await fetch(`https://api.postcodes.io/terminated_postcodes/${encodeURIComponent(pc)}`);
    if (termRes.ok) {
      const termData = await termRes.json();
      if (termData?.result?.latitude && termData?.result?.longitude) {
        return { lat: termData.result.latitude, lng: termData.result.longitude };
      }
    }
  } catch {}

  try {
    // 3. Outcode fallback (e.g. "WA7")
    const outcode = pc.replace(/[0-9][A-Z]{2}$/, '');
    if (outcode && outcode.length >= 2) {
      const outRes = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(outcode)}`);
      if (outRes.ok) {
        const outData = await outRes.json();
        if (outData?.result?.latitude && outData?.result?.longitude) {
          return { lat: outData.result.latitude, lng: outData.result.longitude };
        }
      }
    }
  } catch {}

  return null;
}

/**
 * Resolves address query via Nominatim OSM with automatic street cleaning fallbacks
 */
async function queryNominatim(queryStr: string): Promise<{ lat: number; lng: number } | null> {
  const tryQueries = [queryStr];

  // Try stripping house/unit numbers to locate street/area
  const strippedNumber = queryStr.replace(/^\d+[\w-]*\s+/, '').trim();
  if (strippedNumber !== queryStr && strippedNumber.length > 3) {
    tryQueries.push(strippedNumber);
  }

  // Try stripping postcodes if any mistyped
  const strippedPostcode = queryStr.replace(/\b([A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2})\b/i, '').trim();
  if (strippedPostcode !== queryStr && strippedPostcode.length > 3 && !tryQueries.includes(strippedPostcode)) {
    tryQueries.push(strippedPostcode);
  }

  for (const q of tryQueries) {
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&q=${encodeURIComponent(
        q
      )}`;
      const nomRes = await fetch(nomUrl, {
        headers: {
          'User-Agent': 'ClearViewApp/2.1 (contact@clearview-window-cleaning.app)',
          'Accept': 'application/json',
        },
        next: { revalidate: 86400 },
      });
      if (nomRes.ok) {
        const nomData = await nomRes.json();
        if (Array.isArray(nomData) && nomData.length > 0 && nomData[0].lat && nomData[0].lon) {
          return { lat: parseFloat(nomData[0].lat), lng: parseFloat(nomData[0].lon) };
        }
      }
    } catch {}
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  const normalized = query.toLowerCase().replace(/\s+/g, ' ');

  // 1. Check in-memory cache
  if (geocodeCache.has(normalized)) {
    return NextResponse.json(geocodeCache.get(normalized));
  }

  // 2. Check if query contains a UK postcode
  const postcode = extractUkPostcode(query);
  if (postcode) {
    const pcCoords = await resolvePostcodeCoords(postcode);
    if (pcCoords) {
      geocodeCache.set(normalized, pcCoords);
      return NextResponse.json(pcCoords);
    }
  }

  // 3. Nominatim geocode with fallback cleaning
  const nomCoords = await queryNominatim(query);
  if (nomCoords) {
    geocodeCache.set(normalized, nomCoords);
    return NextResponse.json(nomCoords);
  }

  // 4. Regional fallback check
  for (const [key, coords] of Object.entries(REGIONAL_FALLBACKS)) {
    if (normalized.includes(key)) {
      geocodeCache.set(normalized, coords);
      return NextResponse.json(coords);
    }
  }

  // Not found
  return NextResponse.json({ error: 'Address coordinates not found' }, { status: 404 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const addresses: string[] = Array.isArray(body.addresses) ? body.addresses : [];

    const results: Record<string, { lat: number; lng: number } | null> = {};
    const missingAddresses: string[] = [];

    // Check cache first
    for (const addr of addresses) {
      const norm = addr.trim().toLowerCase().replace(/\s+/g, ' ');
      if (geocodeCache.has(norm)) {
        results[addr] = geocodeCache.get(norm)!;
      } else {
        missingAddresses.push(addr);
      }
    }

    // Batch postcodes if any via free postcodes.io
    const postcodesToQuery: { address: string; pc: string }[] = [];
    for (const addr of missingAddresses) {
      const pc = extractUkPostcode(addr);
      if (pc) {
        postcodesToQuery.push({ address: addr, pc: pc.replace(/\s+/g, '').toUpperCase() });
      }
    }

    if (postcodesToQuery.length > 0) {
      try {
        const res = await fetch('https://api.postcodes.io/postcodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postcodes: postcodesToQuery.map((p) => p.pc) }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.result)) {
            const pcResultMap = new Map<string, { lat: number; lng: number }>();
            const unmappedPostcodes: string[] = [];

            for (const item of data.result) {
              const normalPc = item.query.replace(/\s+/g, '').toUpperCase();
              if (item.result?.latitude && item.result?.longitude) {
                pcResultMap.set(normalPc, {
                  lat: item.result.latitude,
                  lng: item.result.longitude,
                });
              } else {
                unmappedPostcodes.push(normalPc);
              }
            }

            for (const item of postcodesToQuery) {
              const coords = pcResultMap.get(item.pc);
              if (coords) {
                results[item.address] = coords;
                geocodeCache.set(item.address.trim().toLowerCase().replace(/\s+/g, ' '), coords);
              }
            }

            // For unmapped postcodes, try terminated/outcode individually
            for (const unmappedPc of unmappedPostcodes) {
              const resolved = await resolvePostcodeCoords(unmappedPc);
              if (resolved) {
                for (const item of postcodesToQuery) {
                  if (item.pc === unmappedPc && !results[item.address]) {
                    results[item.address] = resolved;
                    geocodeCache.set(item.address.trim().toLowerCase().replace(/\s+/g, ' '), resolved);
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('Batch postcode error:', e);
      }
    }

    // For any still missing, query Nominatim FIRST before regional town centroid fallback
    let fallbackIndex = 0;
    for (const addr of missingAddresses) {
      if (results[addr]) continue;

      const norm = addr.trim().toLowerCase().replace(/\s+/g, ' ');

      // 1. Try Nominatim
      const nomCoords = await queryNominatim(addr);
      if (nomCoords) {
        results[addr] = nomCoords;
        geocodeCache.set(norm, nomCoords);
        continue;
      }

      // 2. Regional fallback with jitter offset so pins never stack on the exact same pixel
      let foundFallback = false;
      for (const [key, coords] of Object.entries(REGIONAL_FALLBACKS)) {
        if (norm.includes(key)) {
          fallbackIndex++;
          const angle = (fallbackIndex * 2 * Math.PI) / 8;
          const radius = 0.0003; // ~30 meters jitter
          const jitterCoords = {
            lat: coords.lat + Math.sin(angle) * radius,
            lng: coords.lng + Math.cos(angle) * (radius / Math.cos((coords.lat * Math.PI) / 180)),
          };
          results[addr] = jitterCoords;
          geocodeCache.set(norm, jitterCoords);
          foundFallback = true;
          break;
        }
      }

      if (!foundFallback) {
        results[addr] = null;
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
