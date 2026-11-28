"use server";

import { isValidCoordinate } from "@/lib/delivery/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWalkingRouteForPreview } from "@/lib/pricing/google-maps";
import { getStaticRouteMap } from "@/lib/pricing/static-route-map";
import { calculateWalkingDeliveryQuote } from "@/lib/pricing/walking-bands";

type Point = { latitude: number; longitude: number };

export async function getWalkingPreview(pickup: Point, destination: Point) {
  // Server actions receive untrusted input; reject bad points before spending Routes API quota.
  if (!isValidCoordinate(pickup) || !isValidCoordinate(destination)) {
    return { status: "unavailable" as const, message: "Select valid pickup and drop-off locations to see the estimate." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { status: "unavailable" as const, message: "Please sign in again to see the estimate." };

  let route;
  try {
    route = await getWalkingRouteForPreview(pickup, destination);
  } catch {
    console.error("Walking route preview failed");
    return { status: "unavailable" as const, message: "Estimate unavailable. The walking route could not be loaded." };
  }

  const price = calculateWalkingDeliveryQuote(route.metres);
  let map: string | null = null;
  if (route.polyline) {
    try {
      map = getStaticRouteMap(pickup, destination, route.polyline);
    } catch {
      console.error("Walking route map unavailable");
    }
  } else {
    console.error("Walking route returned no map geometry");
  }
  return { status: "available" as const, price, map };
}
