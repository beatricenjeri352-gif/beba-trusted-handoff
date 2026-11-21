import { NextResponse } from "next/server";

import { toPlaceSuggestion } from "@/lib/location/search";

const NOMINATIM_HEADERS = {
  Accept: "application/json",
  "User-Agent": "BebaDelivery/1.0 (location search)",
};

interface NominatimRow {
  place_id?: number | string;
  display_name?: string;
  lat?: string;
  lon?: string;
  class?: string;
  type?: string;
  addresstype?: string;
}

async function nominatim(path: string): Promise<NominatimRow | NominatimRow[] | null> {
  const response = await fetch(`https://nominatim.openstreetmap.org/${path}`, {
    headers: NOMINATIM_HEADERS,
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return null;
  return response.json() as Promise<NominatimRow | NominatimRow[]>;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const latitude = url.searchParams.get("lat");
  const longitude = url.searchParams.get("lng");

  try {
    if (latitude && longitude) {
      const payload = await nominatim(
        `reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,
      );
      const suggestion = payload && !Array.isArray(payload) ? toPlaceSuggestion(payload) : null;
      return NextResponse.json({ suggestions: suggestion ? [suggestion] : [] });
    }

    if (query.length < 3) {
      return NextResponse.json({ suggestions: [] });
    }

    const payload = await nominatim(
      `search?format=jsonv2&addressdetails=1&limit=6&countrycodes=ke&q=${encodeURIComponent(query)}`,
    );
    const rows = Array.isArray(payload) ? payload : [];
    return NextResponse.json({
      suggestions: rows.map(toPlaceSuggestion).filter((row): row is NonNullable<typeof row> => row !== null),
    });
  } catch {
    return NextResponse.json({ error: "LOCATION_SEARCH_UNAVAILABLE" }, { status: 503 });
  }
}
