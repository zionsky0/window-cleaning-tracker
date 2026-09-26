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
    try {
      const cleanPc = postcode.replace(/\s+/g, '').toUpperCase();
      const pcRes = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPc)}`);
      if (pcRes.ok) {
        const pcData = await pcRes.json();
        if (pcData?.result?.latitude && pcData?.result?.longitude) {
          const coords = { lat: pcData.result.latitude, lng: pcData.result.longitude };
          geocodeCache.set(normalized, coords);
          return NextResponse.json(coords);
        }
      }
    } catch (e) {
      console.warn('postcodes.io fetch error:', e);
    }
  }

  // 3. Nominatim geocode with compliant headers
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&q=${encodeURIComponent(
      query
    )}`;
    const nomRes = await fetch(nomUrl, {
      headers: {
        'User-Agent': 'ClearViewApp/2.1 (contact@clearview-window-cleaning.app)',
        'Accept': 'application/json',
      },
      next: { revalidate: 86400 }, // Cache 24h
    });

    if (nomRes.ok) {
      const nomData = await nomRes.json();
      if (Array.isArray(nomData) && nomData.length > 0 && nomData[0].lat && nomData[0].lon) {
        const coords = { lat: parseFloat(nomData[0].lat), lng: parseFloat(nomData[0].lon) };
        geocodeCache.set(normalized, coords);
        return NextResponse.json(coords);
      }
    }
  } catch (e) {
    console.warn('Nominatim server-side geocode error:', e);
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
            for (const item of data.result) {
              if (item.result?.latitude && item.result?.longitude) {
                pcResultMap.set(item.query.replace(/\s+/g, '').toUpperCase(), {
                  lat: item.result.latitude,
                  lng: item.result.longitude,
                });
              }
            }

            for (const item of postcodesToQuery) {
              const coords = pcResultMap.get(item.pc);
              if (coords) {
                results[item.address] = coords;
                geocodeCache.set(item.address.trim().toLowerCase().replace(/\s+/g, ' '), coords);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Batch postcode error:', e);
      }
    }

    // For any still missing, try regional fallbacks or throttled Nominatim
    for (const addr of missingAddresses) {
      if (results[addr]) continue;

      const norm = addr.trim().toLowerCase().replace(/\s+/g, ' ');

      // Check regional fallbacks
      let foundFallback = false;
      for (const [key, coords] of Object.entries(REGIONAL_FALLBACKS)) {
        if (norm.includes(key)) {
          results[addr] = coords;
          geocodeCache.set(norm, coords);
          foundFallback = true;
          break;
        }
      }

      if (!foundFallback) {
        try {
          // 1000ms delay to strictly comply with Nominatim Acceptable Use Policy
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&q=${encodeURIComponent(
            addr
          )}`;
          const nomRes = await fetch(nomUrl, {
            headers: {
              'User-Agent': 'ClearViewApp/2.1 (contact@clearview-window-cleaning.app)',
            },
          });
          if (nomRes.ok) {
            const nomData = await nomRes.json();
            if (Array.isArray(nomData) && nomData.length > 0 && nomData[0].lat && nomData[0].lon) {
              const coords = { lat: parseFloat(nomData[0].lat), lng: parseFloat(nomData[0].lon) };
              results[addr] = coords;
              geocodeCache.set(norm, coords);
            }
          }
        } catch (e) {
          // ignore error
        }
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
