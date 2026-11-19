import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

interface ActivePricingConfig {
  id: string;
  name: string;
  base_fee_cents: number;
  walking_rate_cents_per_km: number;
  bicycle_rate_cents_per_km: number;
  motorbike_rate_cents_per_km: number;
  car_rate_cents_per_km: number;
  minimum_billable_distance_metres: number;
  commission_percent_hundredths: number;
  effective_from: string;
}

interface PendingCharge {
  id: string;
  proposed_amount_cents: number;
  reason: string;
  sender_agreed_at: string | null;
  carrier_agreed_at: string | null;
  status: string;
}

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role, status")
    .eq("user_id", user.id)
    .eq("role", "administrator")
    .eq("status", "approved")
    .limit(1);

  if (!roleRows?.length) redirect("/deliveries");

  const pricingQuery = supabase
    .from("pricing_configurations")
    .select("id, name, base_fee_cents, walking_rate_cents_per_km, bicycle_rate_cents_per_km, motorbike_rate_cents_per_km, car_rate_cents_per_km, minimum_billable_distance_metres, commission_percent_hundredths, effective_from")
    .eq("status", "active")
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: activeConfigRaw } = await pricingQuery;
  const activeConfig = activeConfigRaw as ActivePricingConfig | null;

  const { data: pendingChargesRaw } = await supabase
    .from("negotiated_charges")
    .select("id, proposed_amount_cents, reason, sender_agreed_at, carrier_agreed_at, status")
    .eq("status", "carrier_agreed")
    .order("created_at", { ascending: false });

  const pendingCharges = (pendingChargesRaw ?? []) as PendingCharge[];

  async function savePricingConfiguration(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) redirect("/login");

    const { data: administrator } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .eq("role", "administrator")
      .eq("status", "approved")
      .maybeSingle();

    if (!administrator) redirect("/deliveries");

    const baseFee = Number(String(formData.get("baseFee") ?? ""));
    const walkingRate = Number(String(formData.get("walkingRate") ?? ""));
    const bicycleRate = Number(String(formData.get("bicycleRate") ?? ""));
    const motorbikeRate = Number(String(formData.get("motorbikeRate") ?? ""));
    const carRate = Number(String(formData.get("carRate") ?? ""));
    const minimumDistance = Number(String(formData.get("minimumDistance") ?? ""));
    const commissionPercent = Number(String(formData.get("commissionPercent") ?? ""));

    if ([baseFee, walkingRate, bicycleRate, motorbikeRate, carRate, minimumDistance, commissionPercent].some((value) => !Number.isFinite(value) || value < 0)) {
      redirect("/dashboard?error=invalid-pricing");
    }
    if (commissionPercent > 100) redirect("/dashboard?error=invalid-pricing");

    await supabase
      .from("pricing_configurations")
      .update({ status: "inactive", effective_until: new Date().toISOString() })
      .eq("status", "active");

    const { error } = await supabase
      .from("pricing_configurations")
      .insert({
        name: "Administrator pricing configuration",
        base_fee_cents: Math.round(baseFee * 100),
        walking_rate_cents_per_km: Math.round(walkingRate * 100),
        bicycle_rate_cents_per_km: Math.round(bicycleRate * 100),
        motorbike_rate_cents_per_km: Math.round(motorbikeRate * 100),
        car_rate_cents_per_km: Math.round(carRate * 100),
        minimum_billable_distance_metres: Math.round(minimumDistance * 1000),
        commission_percent_hundredths: Math.round(commissionPercent * 100),
        status: "active",
        effective_from: new Date().toISOString(),
        changed_by: currentUser.id,
      });

    if (error) redirect("/dashboard?error=pricing-save-failed");

    revalidatePath("/dashboard");
    redirect("/dashboard?saved=pricing");
  }

  async function approveCharge(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) redirect("/login");

    const chargeId = String(formData.get("chargeId") ?? "");
    if (!chargeId) redirect("/dashboard?error=charge-required");

    const { error } = await supabase.rpc("approve_negotiated_charge", {
      charge_id: chargeId,
    });

    if (error) redirect("/dashboard?error=charge-approval-failed");

    revalidatePath("/dashboard");
    redirect("/dashboard?saved=charge-approved");
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-sm font-semibold text-emerald-700">Administrator workspace</p>
      <h1 className="mt-2 text-3xl font-bold">Pricing configuration</h1>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Active configuration</h2>
        <form action={savePricingConfiguration} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="baseFee">Base fee (KES)</label>
            <input id="baseFee" name="baseFee" type="number" min="0" step="0.01" defaultValue={(activeConfig?.base_fee_cents ?? 5000) / 100} className="w-full rounded-xl border border-slate-300 px-4 py-3" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="walkingRate">Walking rate (KES/km)</label>
            <input id="walkingRate" name="walkingRate" type="number" min="0" step="0.01" defaultValue={(activeConfig?.walking_rate_cents_per_km ?? 1000) / 100} className="w-full rounded-xl border border-slate-300 px-4 py-3" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="bicycleRate">Bicycle rate (KES/km)</label>
            <input id="bicycleRate" name="bicycleRate" type="number" min="0" step="0.01" defaultValue={(activeConfig?.bicycle_rate_cents_per_km ?? 2000) / 100} className="w-full rounded-xl border border-slate-300 px-4 py-3" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="motorbikeRate">Motorbike rate (KES/km)</label>
            <input id="motorbikeRate" name="motorbikeRate" type="number" min="0" step="0.01" defaultValue={(activeConfig?.motorbike_rate_cents_per_km ?? 2000) / 100} className="w-full rounded-xl border border-slate-300 px-4 py-3" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="carRate">Car rate (KES/km)</label>
            <input id="carRate" name="carRate" type="number" min="0" step="0.01" defaultValue={(activeConfig?.car_rate_cents_per_km ?? 2000) / 100} className="w-full rounded-xl border border-slate-300 px-4 py-3" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="minimumDistance">Minimum billable distance (km)</label>
            <input id="minimumDistance" name="minimumDistance" type="number" min="0" step="0.001" defaultValue={(activeConfig?.minimum_billable_distance_metres ?? 5000) / 1000} className="w-full rounded-xl border border-slate-300 px-4 py-3" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="commissionPercent">Beba commission (%)</label>
            <input id="commissionPercent" name="commissionPercent" type="number" min="0" max="100" step="0.01" defaultValue={(activeConfig?.commission_percent_hundredths ?? 1000) / 100} className="w-full rounded-xl border border-slate-300 px-4 py-3" required />
          </div>
          <div className="flex items-end">
            <button className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white">Activate new configuration</button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 p-6">
        <h2 className="text-xl font-bold">Negotiated charge approvals</h2>
        <div className="mt-4 space-y-3">
          {pendingCharges.length ? pendingCharges.map((charge) => (
            <article key={charge.id} className="rounded-xl bg-slate-50 p-4">
              <p className="font-bold">KES {(charge.proposed_amount_cents / 100).toFixed(2)}</p>
              <p className="mt-1 text-sm text-slate-600">{charge.reason}</p>
              <form action={approveCharge} className="mt-3">
                <input type="hidden" name="chargeId" value={charge.id} />
                <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Approve and revise quote</button>
              </form>
            </article>
          )) : (
            <p className="text-sm text-slate-600">No negotiated charges require approval.</p>
          )}
        </div>
      </section>
    </main>
  );
}
