export interface PlaceSuggestion {
  id: string;
  label: string;
  kind: string;
  latitude: number;
  longitude: number;
}

export function describePlaceKind(input: {
  class?: string | null;
  type?: string | null;
  addresstype?: string | null;
}): string {
  const placeClass = input.class?.trim().toLowerCase() ?? "";
  const type = (input.addresstype || input.type || "").trim().toLowerCase();

  if (placeClass === "highway" || ["road", "residential", "primary", "secondary", "tertiary", "trunk", "unclassified"].includes(type)) {
    return "Road";
  }
  if (["bus_stop", "station", "halt", "platform"].includes(type)) return "Stage";
  if (["city", "town", "village", "suburb", "neighbourhood", "neighborhood", "hamlet", "county", "state", "municipality"].includes(type) || placeClass === "place") {
    return "Area";
  }
  if (placeClass === "amenity" || placeClass === "shop" || placeClass === "building" || type === "building") {
    return "Place";
  }
  return "Location";
}

export function toPlaceSuggestion(row: {
  place_id?: number | string;
  display_name?: string;
  lat?: string;
  lon?: string;
  class?: string;
  type?: string;
  addresstype?: string;
}): PlaceSuggestion | null {
  const latitude = Number(row.lat);
  const longitude = Number(row.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !row.display_name) return null;

  return {
    id: String(row.place_id ?? `${latitude},${longitude}`),
    label: row.display_name,
    kind: describePlaceKind(row),
    latitude,
    longitude,
  };
}
