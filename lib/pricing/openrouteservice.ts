import type { TransportMethod } from "./delivery-pricing";

export interface RouteDistanceResult {
  metres: number;
  provider: "openrouteservice";
  providerReference: string | null;
}

export function getOpenRouteServiceProfile(transportMethod: TransportMethod): string {
  switch (transportMethod) {
    case "walking":
      return "foot-walking";
    case "bicycle":
      return "cycling-regular";
    case "motorbike":
    case "car":
      return "driving-car";
  }
}

export async function getActualRouteDistanceMetres(
  transportMethod: TransportMethod,
  pickup: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
): Promise<RouteDistanceResult> {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;
  if (!apiKey) throw new Error("ROUTING_PROVIDER_NOT_CONFIGURED");

  const profile = getOpenRouteServiceProfile(transportMethod);
  const response = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}/json`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      coordinates: [
        [pickup.longitude, pickup.latitude],
        [destination.longitude, destination.latitude],
      ],
    }),
  });

  if (!response.ok) throw new Error("ROUTE_DISTANCE_NOT_AVAILABLE");

  const payload = await response.json() as {
    routes?: Array<{ summary?: { distance?: number }; metadata?: { id?: string } }>;
    metadata?: { engine?: { id?: string } };
  };

  const distanceMetres = payload.routes?.[0]?.summary?.distance;
  if (!Number.isFinite(distanceMetres) || !distanceMetres || distanceMetres < 0) {
    throw new Error("ROUTE_DISTANCE_NOT_AVAILABLE");
  }

  return {
    metres: Math.round(distanceMetres),
    provider: "openrouteservice",
    providerReference: payload.routes?.[0]?.metadata?.id ?? payload.metadata?.engine?.id ?? null,
  };
}
