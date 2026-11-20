import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ProfileSwitcher } from "@/components/profile-switcher";
import { isCarrierProfileLocked } from "@/lib/profiles/carrier-lock";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface AssignmentRow {
  id: string;
  delivery_request_id: string;
  assignment_status: string;
  delivery_requests?: { tracking_number?: string; parcel_description?: string; current_status?: string } | null;
}

interface QuoteRow {
  id: string;
  delivery_request_id: string;
  final_agreed_price_cents: number;
  quote_status: string;
}

interface ChargeRow {
  id: string;
  delivery_request_id: string;
  proposed_amount_cents: number;
  reason: string;
  sender_agreed_at: string | null;
  carrier_agreed_at: string | null;
  status: string;
}

export default async function CarrierPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("carrier_profiles")
    .select("carrier_type, operating_towns, delivery_methods, vehicle_type, vehicle_registration, profile_description, approval_status, active_status")
    .eq("user_id", user.id)
    .maybeSingle();

  async function submitCarrierApplication(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) redirect("/login");

    if (await isCarrierProfileLocked(currentUser.id)) {
      redirect("/jobs?error=carrier-locked");
    }

    const carrierType = String(formData.get("carrierType") ?? "").trim();
    const operatingTowns = String(formData.get("operatingTowns") ?? "")
      .split(",")
      .map((town) => town.trim())
      .filter(Boolean);
    const deliveryMethods = formData
      .getAll("deliveryMethods")
      .map((method) => String(method));
    const vehicleType = String(formData.get("vehicleType") ?? "").trim() || null;
    const vehicleRegistration = String(formData.get("vehicleRegistration") ?? "").trim() || null;
    const profileDescription = String(formData.get("profileDescription") ?? "").trim();

    if (!carrierType || operatingTowns.length === 0 || deliveryMethods.length === 0 || !profileDescription) {
      redirect("/jobs?error=required-fields");
    }

    const { error: profileError } = await supabase.from("carrier_profiles").upsert(
      {
        user_id: currentUser.id,
        carrier_type: carrierType,
        operating_towns: operatingTowns,
        delivery_methods: deliveryMethods,
        vehicle_type: vehicleType,
        vehicle_registration: vehicleRegistration,
        profile_description: profileDescription,
        approval_status: "pending",
        active_status: false,
      },
      { onConflict: "user_id" },
    );

    if (profileError) {
      console.error("Carrier profile save failed", profileError);
      redirect(`/jobs?error=application-save-failed&reason=${encodeURIComponent(profileError.code || "unknown")}`);
    }

    const { error: roleError } = await supabase.rpc("apply_for_carrier");
    if (roleError) {
      console.error("Carrier role update failed", roleError);
      redirect(`/jobs?error=role-save-failed&reason=${encodeURIComponent(roleError.code || "unknown")}`);
    }

    revalidatePath("/jobs");
    redirect("/jobs?saved=1");
  }

  const { data: assignmentsRaw } = await supabase
    .from("delivery_assignments")
    .select("id, delivery_request_id, assignment_status, delivery_requests(tracking_number, parcel_description, current_status)")
    .eq("carrier_user_id", user.id)
    .order("selected_at", { ascending: false });

  const assignments = (assignmentsRaw ?? []) as unknown as AssignmentRow[];

  async function respondToAssignment(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) redirect("/login");

    const assignmentId = String(formData.get("assignmentId") ?? "");
    const response = String(formData.get("response") ?? "");

    if (!assignmentId || !["accepted", "declined"].includes(response)) {
      redirect("/jobs?error=invalid-response");
    }

    const { error } = await supabase.rpc("respond_to_delivery_assignment", {
      assignment_id: assignmentId,
      response,
    });

    if (error) redirect("/jobs?error=assignment-response-failed");

    revalidatePath("/jobs");
    redirect("/jobs?saved=assignment-response");
  }

  const deliveryIds = assignments.map((assignment) => assignment.delivery_request_id);

  const { data: quoteRowsRaw } = deliveryIds.length
    ? await supabase
        .from("delivery_quotes")
        .select("id, delivery_request_id, final_agreed_price_cents, quote_status")
        .in("delivery_request_id", deliveryIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const quoteRows = (quoteRowsRaw ?? []) as unknown as QuoteRow[];
  const quoteByDelivery = new Map<string, QuoteRow>();
  for (const quote of quoteRows) {
    if (!quoteByDelivery.has(quote.delivery_request_id)) quoteByDelivery.set(quote.delivery_request_id, quote);
  }

  const { data: chargeRowsRaw } = deliveryIds.length
    ? await supabase
        .from("negotiated_charges")
        .select("id, delivery_request_id, proposed_amount_cents, reason, sender_agreed_at, carrier_agreed_at, status")
        .in("delivery_request_id", deliveryIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const chargeRows = (chargeRowsRaw ?? []) as unknown as ChargeRow[];

  async function proposeAdditionalCharge(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) redirect("/jobs?error=authentication-required");

    const deliveryId = String(formData.get("deliveryId") ?? "");
    const quoteId = String(formData.get("quoteId") ?? "");
    const amountKes = Number(String(formData.get("amount") ?? ""));
    const reason = String(formData.get("reason") ?? "").trim();

    if (!deliveryId || !quoteId || !Number.isFinite(amountKes) || amountKes < 0 || !reason) {
      redirect("/jobs?error=charge-required");
    }

    const { error } = await supabase.rpc("carrier_propose_negotiated_charge", {
      delivery_id: deliveryId,
      quote_id: quoteId,
      proposed_amount_cents: Math.round(amountKes * 100),
      reason,
    });

    if (error) redirect("/jobs?error=charge-proposal-failed");

    revalidatePath("/jobs");
    redirect("/jobs?saved=charge-proposed");
  }

  async function agreeToAdditionalCharge(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) redirect("/login");

    const chargeId = String(formData.get("chargeId") ?? "");
    if (!chargeId) redirect("/jobs?error=charge-required");

    const { error } = await supabase.rpc("carrier_agree_negotiated_charge", {
      charge_id: chargeId,
    });

    if (error) redirect("/jobs?error=charge-agreement-failed");

    revalidatePath("/jobs");
    redirect("/jobs?saved=charge-agreed");
  }

  const applicationStatus = profile?.approval_status?.replaceAll("_", " ") ?? "Not applied";
  const locked = await isCarrierProfileLocked(user.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <ProfileSwitcher current="carrier" />
      <p className="mt-6 text-sm font-semibold text-emerald-700">Carrier workspace</p>
      <h1 className="mt-2 text-3xl font-bold">Carrier application</h1>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-600">Application status</p>
        <p className="mt-1 font-bold capitalize">{applicationStatus}</p>
      </div>

      {params.saved === "1" ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
          Carrier application submitted for review.
        </p>
      ) : null}

      {params.error ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800" role="alert">
          {params.error === "required-fields"
            ? "Complete the carrier type, operating towns, delivery methods, and profile description."
            : params.error === "carrier-locked"
              ? "Your carrier profile is rejected or suspended. An administrator must restore it before you can change it."
            : params.reason
              ? `The carrier application could not be saved. Database code: ${params.reason}.`
              : "The carrier application could not be saved. Please try again."}
        </p>
      ) : null}

      <section className="mt-6">
        <h2 className="text-xl font-bold">Delivery assignments</h2>
        <div className="mt-3 space-y-3">
          {assignments.length ? assignments.map((assignment) => (
            <article key={assignment.id} className="rounded-2xl border border-slate-200 p-5">
              <p className="font-bold">{assignment.delivery_requests?.tracking_number || "Delivery request"}</p>
              <p className="mt-1 text-sm text-slate-600">{assignment.delivery_requests?.parcel_description}</p>
              <p className="mt-2 text-sm font-semibold capitalize">{assignment.assignment_status.replaceAll("_", " ")}</p>

              {assignment.assignment_status === "pending_carrier_confirmation" ? (
                <div className="mt-4 flex gap-3">
                  <form action={respondToAssignment}>
                    <input type="hidden" name="assignmentId" value={assignment.id} />
                    <input type="hidden" name="response" value="accepted" />
                    <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Accept</button>
                  </form>
                  <form action={respondToAssignment}>
                    <input type="hidden" name="assignmentId" value={assignment.id} />
                    <input type="hidden" name="response" value="declined" />
                    <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Decline</button>
                  </form>
                </div>
              ) : null}

              {assignment.assignment_status === "accepted" ? (
                <div className="mt-4 rounded-xl border border-slate-200 p-4">
                  {(() => {
                    const quote = quoteByDelivery.get(assignment.delivery_request_id);
                    if (!quote) {
                      return <p className="text-sm text-slate-600">A delivery quote must exist before an additional charge can be proposed.</p>;
                    }

                    return (
                      <form action={proposeAdditionalCharge} className="grid gap-3 sm:grid-cols-[120px_1fr]">
                        <input type="hidden" name="deliveryId" value={assignment.delivery_request_id} />
                        <input type="hidden" name="quoteId" value={quote.id} />
                        <div>
                          <label className="mb-2 block text-sm font-medium" htmlFor={`chargeAmount-${assignment.id}`}>Extra amount (KES)</label>
                          <input id={`chargeAmount-${assignment.id}`} name="amount" type="number" min="0" step="0.01" className="w-full rounded-xl border border-slate-300 px-3 py-2" />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium" htmlFor={`chargeReason-${assignment.id}`}>Reason</label>
                          <input id={`chargeReason-${assignment.id}`} name="reason" type="text" placeholder="Waiting time, special handling, or approved extra" className="w-full rounded-xl border border-slate-300 px-3 py-2" />
                        </div>
                        <button className="sm:col-span-2 rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-700">Propose additional charge</button>
                      </form>
                    );
                  })()}

                  {chargeRows.filter((charge) => charge.delivery_request_id === assignment.delivery_request_id).map((charge) => (
                    <article key={charge.id} className="mt-3 rounded-lg bg-slate-50 p-3">
                      <p className="font-semibold">KES {(Number(charge.proposed_amount_cents) / 100).toFixed(2)}</p>
                      <p className="text-sm text-slate-600">{charge.reason}</p>
                      {!charge.carrier_agreed_at ? (
                        <form action={agreeToAdditionalCharge} className="mt-2">
                          <input type="hidden" name="chargeId" value={charge.id} />
                          <button className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Agree to this charge</button>
                        </form>
                      ) : (
                        <p className="mt-2 text-xs text-emerald-700">Carrier agreement recorded</p>
                      )}
                    </article>
                  ))}
                </div>
              ) : null}
            </article>
          )) : (
            <p className="rounded-xl border border-slate-200 p-5 text-sm text-slate-600">No delivery assignments yet.</p>
          )}
        </div>
      </section>

      {locked ? (
        <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Your carrier application is {applicationStatus}. You cannot apply again until an administrator approves your account.
        </p>
      ) : (
      <form action={submitCarrierApplication} className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="carrierType">Carrier type</label>
          <select id="carrierType" name="carrierType" defaultValue={profile?.carrier_type ?? ""} className="w-full rounded-xl border border-slate-300 px-4 py-3" required>
            <option value="">Select carrier type</option>
            <option value="individual">Individual carrier</option>
            <option value="motorcycle">Motorcycle carrier</option>
            <option value="car">Car carrier</option>
            <option value="van">Van or pickup carrier</option>
            <option value="matatu">Matatu or public transport carrier</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="operatingTowns">Operating towns</label>
          <input id="operatingTowns" name="operatingTowns" type="text" defaultValue={profile?.operating_towns?.join(", ") ?? ""} placeholder="Nairobi, Thika, Kitale" className="w-full rounded-xl border border-slate-300 px-4 py-3" required />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Delivery methods</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {["within_town", "to_stage", "intertown"].map((method) => (
              <label key={method} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm">
                <input type="checkbox" name="deliveryMethods" value={method} defaultChecked={profile?.delivery_methods?.includes(method)} />
                {method.replaceAll("_", " ")}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="vehicleType">Vehicle type</label>
            <select id="vehicleType" name="vehicleType" defaultValue={profile?.vehicle_type ?? ""} className="w-full rounded-xl border border-slate-300 px-4 py-3">
              {profile?.vehicle_type && !["bicycle", "motorcycle", "tuktuk", "car", "pickup", "van", "truck", "matatu", "public_transport", "walking", "other"].includes(profile.vehicle_type) ? (
                <option value={profile.vehicle_type}>{profile.vehicle_type}</option>
              ) : null}
              <option value="">Select vehicle type</option>
              <option value="bicycle">Bicycle</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="tuktuk">Tuk-tuk</option>
              <option value="car">Car</option>
              <option value="pickup">Pickup</option>
              <option value="van">Van</option>
              <option value="truck">Truck</option>
              <option value="matatu">Matatu</option>
              <option value="public_transport">Public transport</option>
              <option value="walking">On foot / walking</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="vehicleRegistration">Vehicle registration</label>
            <input id="vehicleRegistration" name="vehicleRegistration" type="text" defaultValue={profile?.vehicle_registration ?? ""} placeholder="KDA 123A" className="w-full rounded-xl border border-slate-300 px-4 py-3" />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="profileDescription">About your delivery service</label>
          <textarea id="profileDescription" name="profileDescription" rows={4} defaultValue={profile?.profile_description ?? ""} className="w-full rounded-xl border border-slate-300 px-4 py-3" required />
        </div>

        <button className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white">
          {profile ? "Update carrier application" : "Submit carrier application"}
        </button>
      </form>
      )}
    </main>
  );
}
