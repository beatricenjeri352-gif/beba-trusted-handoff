"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidCoordinate } from "@/lib/carrier/location";

export async function publishCarrierLocation(latitude: number, longitude: number) {
  if (!isValidCoordinate(latitude, longitude)) return { ok: false as const, error: "LOCATION_INVALID" };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "NOT_SIGNED_IN" };

  const { error } = await supabase.from("carrier_locations").upsert(
    {
      carrier_user_id: user.id,
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "carrier_user_id" },
  );

  return error ? { ok: false as const, error: "LOCATION_NOT_SAVED" } : { ok: true as const };
}

export async function clearCarrierLocation() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "NOT_SIGNED_IN" };

  const { error } = await supabase.from("carrier_locations").delete().eq("carrier_user_id", user.id);
  return error ? { ok: false as const, error: "LOCATION_NOT_CLEARED" } : { ok: true as const };
}
