import type { TransportMethod } from "./delivery-pricing";

export interface RouteDistanceResult {
  metres: number;
  provider: "google_maps_routes";
  providerReference: string | null;
}

export function getGoogleMapsTravelMode(
  transportMethod: TransportMethod,
): "WALK" | "BICYCLE" | "TWO_WHEELER" | "DRIVE" {
  switch (transportMethod) {
    case "walking":
      return "WALK";
    case "bicycle":
      return "BICYCLE";
    case "motorbike":
      return "TWO_WHEELER";
    case "car":
      return "DRIVE";
  }
}

interface GoogleRoutesResponse {
  routes?: Array<{ distanceMeters?: number; polyline?: { encodedPolyline?: string } }>;
}

async function requestRoute(
  transportMethod: TransportMethod,
  pickup: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  includePolyline: boolean,
) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) throw new Error("ROUTING_PROVIDER_NOT_CONFIGURED");

  const coordinates = [pickup.latitude, pickup.longitude, destination.latitude, destination.longitude];
  if (
    coordinates.some((coordinate) => !Number.isFinite(coordinate))
    || pickup.latitude < -90
    || pickup.latitude > 90
    || destination.latitude < -90
    || destination.latitude > 90
    || pickup.longitude < -180
    || pickup.longitude > 180
    || destination.longitude < -180
    || destination.longitude > 180
  ) {
    throw new Error("ROUTE_DISTANCE_NOT_AVAILABLE");
  }

  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": includePolyline ? "routes.distanceMeters,routes.polyline.encodedPolyline" : "routes.distanceMeters",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      origin: { location: { latLng: pickup } },
      destination: { location: { latLng: destination } },
      travelMode: getGoogleMapsTravelMode(transportMethod),
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error("ROUTE_DISTANCE_NOT_AVAILABLE");

  const payload = await response.json() as GoogleRoutesResponse;
  const distanceMetres = payload.routes?.[0]?.distanceMeters;
  if (
    typeof distanceMetres !== "number"
    || !Number.isSafeInteger(distanceMetres)
    || distanceMetres < 0
  ) {
    throw new Error("ROUTE_DISTANCE_NOT_AVAILABLE");
  }

  return { metres: distanceMetres, polyline: payload.routes?.[0]?.polyline?.encodedPolyline ?? null };
}

export async function getActualRouteDistanceMetres(
  transportMethod: TransportMethod,
  pickup: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
): Promise<RouteDistanceResult> {
  const route = await requestRoute(transportMethod, pickup, destination, false);
  return {
    metres: route.metres,
    provider: "google_maps_routes",
    providerReference: null,
  };
}

export async function getWalkingRouteForPreview(
  pickup: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
) {
  return requestRoute("walking", pickup, destination, true);
}
