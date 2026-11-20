import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { PageShell } from "@/components/page-shell";
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

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const params = await searchParams;
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

  const { data: activeConfigRaw, error: pricingConfigError } = await pricingQuery;
  if (pricingConfigError) console.error("Pricing configuration load failed", pricingConfigError);
  const activeConfig = activeConfigRaw as ActivePricingConfig | null;

  const { data: pendingChargesRaw, error: pendingChargesError } = await supabase
    .from("negotiated_charges")
    .select("id, proposed_amount_cents, reason, sender_agreed_at, carrier_agreed_at, status")
    .eq("status", "carrier_agreed")
    .order("created_at", { ascending: false });

  if (pendingChargesError) console.error("Negotiated charge load failed", pendingChargesError);
  const pendingCharges = ((pendingChargesRaw ?? []) as PendingCharge[]).filter(
    (charge) => charge.sender_agreed_at !== null && charge.carrier_agreed_at !== null,
  );

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
    const amountsKes = [baseFee, walkingRate, bicycleRate, motorbikeRate, carRate];
    const amountsCents = amountsKes.map((amount) => Math.round(amount * 100));

    if (amountsKes.some((amount, index) =>
      !Number.isFinite(amount)
      || amount < 0
      || !Number.isSafeInteger(amountsCents[index])
      || amountsCents[index] > 2147483647
      || Math.abs(amount * 100 - amountsCents[index]) > 1e-7
    )) {
      redirect("/dashboard?error=invalid-pricing");
    }

    const { error } = await supabase.rpc("save_pricing_configuration", {
      p_base_fee_cents: amountsCents[0],
      p_walking_rate_cents_per_km: amountsCents[1],
      p_bicycle_rate_cents_per_km: amountsCents[2],
      p_motorbike_rate_cents_per_km: amountsCents[3],
      p_car_rate_cents_per_km: amountsCents[4],
    });

    if (error) {
      console.error("Pricing configuration save failed", error);
      redirect("/dashboard?error=pricing-save-failed");
    }

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
    <PageShell width="wide">
      <p className="text-sm font-semibold text-emerald-700">Administrator workspace</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Pricing configuration</h1>

      {params.error ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800" role="alert">
          {params.error === "invalid-pricing"
            ? "Enter non-negative amounts with no more than two decimal places."
            : "The requested pricing change could not be completed. Please try again."}
        </p>
      ) : params.saved ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
          {params.saved === "pricing" ? "Pricing configuration activated." : "Negotiated charge approved."}
        </p>
      ) : null}

      {pricingConfigError ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800" role="alert">
          The current pricing configuration could not be loaded. Saving is disabled until it can be checked.
        </p>
      ) : null}
      {pendingChargesError ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800" role="alert">
          Negotiated charges could not be loaded.
        </p>
      ) : null}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
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
            <p className="text-sm font-medium">Minimum billable distance</p>
            <p className="mt-2 rounded-xl border border-slate-200 px-4 py-3">5 km (fixed)</p>
          </div>
          <div>
            <p className="text-sm font-medium">Beba commission</p>
            <p className="mt-2 rounded-xl border border-slate-200 px-4 py-3">10% (fixed)</p>
          </div>
          <div className="flex items-end">
            <button disabled={Boolean(pricingConfigError)} className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Activate new configuration</button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 p-4 sm:p-6">
        <h2 className="text-xl font-bold">Negotiated charge approvals</h2>
        <div className="mt-4 space-y-3">
          {pendingCharges.length ? pendingCharges.map((charge) => (
            <article key={charge.id} className="rounded-xl bg-slate-50 p-4">
              <p className="font-bold">KES {(charge.proposed_amount_cents / 100).toFixed(2)}</p>
              <p className="mt-1 text-sm text-slate-600">{charge.reason}</p>
              <form action={approveCharge} className="mt-3">
                <input type="hidden" name="chargeId" value={charge.id} />
                <button className="min-h-11 w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white sm:w-auto">Approve and revise quote</button>
              </form>
            </article>
          )) : (
            <p className="text-sm text-slate-600">No negotiated charges require approval.</p>
          )}
        </div>
      </section>
    </PageShell>
  );
}
