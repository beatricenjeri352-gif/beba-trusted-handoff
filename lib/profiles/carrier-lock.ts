import { createSupabaseServerClient } from "@/lib/supabase/server";

const LOCKED_STATUSES = ["rejected", "suspended"];

export async function isCarrierProfileLocked(userId: string) {
  const supabase = await createSupabaseServerClient();

  const [{ data: roleRow }, { data: profileRow }] = await Promise.all([
    supabase.from("user_roles").select("status").eq("user_id", userId).eq("role", "carrier").maybeSingle(),
    supabase.from("carrier_profiles").select("approval_status").eq("user_id", userId).maybeSingle(),
  ]);

  return (
    LOCKED_STATUSES.includes(roleRow?.status ?? "") ||
    LOCKED_STATUSES.includes(profileRow?.approval_status ?? "")
  );
}
