import { isLocationFresh } from "@/lib/carrier/location";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getActualRouteDistanceMetres } from "@/lib/pricing/google-maps";

export const MAX_ROUTE_LOOKUPS = 10;

interface Point {
  latitude: number;
  longitude: number;
}

export async function getCarrierDistancesToPickup(
  carrierIds: string[],
  pickup: Point,
  nowMs = Date.now(),
): Promise<Map<string, number | null>> {
  if (!carrierIds.length) return new Map();

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("carrier_locations")
    .select("carrier_user_id, latitude, longitude, updated_at")
    .in("carrier_user_id", carrierIds);

  const onlineRows = (data ?? []).filter((row) => isLocationFresh(row.updated_at, nowMs));
  const distances = await getRoadDistancesMetres(
    onlineRows.map((row) => ({
      key: row.carrier_user_id,
      from: { latitude: Number(row.latitude), longitude: Number(row.longitude) },
      to: pickup,
    })),
  );

  return new Map(onlineRows.map((row) => [row.carrier_user_id, distances.get(row.carrier_user_id) ?? null]));
}

export interface RouteLookup {
  key: string;
  from: { latitude: number; longitude: number };
  to: { latitude: number; longitude: number };
}

export async function getRoadDistancesMetres(lookups: RouteLookup[]): Promise<Map<string, number | null>> {
  const entries = await Promise.all(
    lookups.slice(0, MAX_ROUTE_LOOKUPS).map(async (lookup): Promise<[string, number | null]> => {
      try {
        const route = await getActualRouteDistanceMetres("walking", lookup.from, lookup.to);
        return [lookup.key, route.metres];
      } catch {
        return [lookup.key, null];
      }
    }),
  );
  return new Map(entries);
}
