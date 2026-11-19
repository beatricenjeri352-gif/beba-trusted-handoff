import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getActualRouteDistanceMetres } from "@/lib/pricing/openrouteservice";
import { normalizeTransportMethod } from "@/lib/pricing/delivery-pricing";

interface AssignmentRow {
  id: string;
  carrier_user_id: string;
  assignment_status: string;
}

interface QuoteRow {
  id: string;
  transport_method: string;
  actual_route_distance_metres: number;
  minimum_billable_distance_metres: number;
  billable_distance_metres: number;
  base_fee_cents: number;
  distance_rate_cents_per_km: number;
  distance_charge_cents: number;
  original_calculated_price_cents: number;
  final_agreed_price_cents: number;
  currency: string;
  commission_percent_hundredths: number;
  commission_amount_cents: number;
  quote_status: string;
  valid_until: string | null;
  created_at: string;
}

interface ChargeRow {
  id: string;
  proposed_amount_cents: number;
  reason: string;
  sender_agreed_at: string | null;
  carrier_agreed_at: string | null;
  status: string;
}

export default async function DeliveryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: delivery } = await supabase
    .from("delivery_requests")
    .select("id, tracking_number, delivery_method, parcel_description, parcel_size, weight_kg, current_status, created_at")
    .eq("id", id)
    .eq("sender_user_id", user.id)
    .maybeSingle();

  if (!delivery) notFound();

  const { data: stops } = await supabase
    .from("delivery_stops")
    .select("stop_type, sequence_number, location_name, latitude, longitude, instructions, contact_name, contact_phone")
    .eq("delivery_request_id", delivery.id)
    .order("sequence_number", { ascending: true });

  const { data: assignmentRaw } = await supabase
    .from("delivery_assignments")
    .select("id, carrier_user_id, assignment_status")
    .eq("delivery_request_id", delivery.id)
    .in("assignment_status", ["pending_carrier_confirmation", "accepted"])
    .maybeSingle();

  const { data: latestQuoteRaw } = await supabase
    .from("delivery_quotes")
    .select("id, transport_method, actual_route_distance_metres, minimum_billable_distance_metres, billable_distance_metres, base_fee_cents, distance_rate_cents_per_km, distance_charge_cents, original_calculated_price_cents, final_agreed_price_cents, currency, commission_percent_hundredths, commission_amount_cents, quote_status, valid_until, created_at")
    .eq("delivery_request_id", delivery.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const assignment = assignmentRaw as AssignmentRow | null;
  const latestQuote = latestQuoteRaw as QuoteRow | null;

  const { data: negotiatedChargesRaw } = latestQuote
    ? await supabase
        .from("negotiated_charges")
        .select("id, proposed_amount_cents, reason, sender_agreed_at, carrier_agreed_at, status, created_at")
        .eq("delivery_quote_id", latestQuote.id)
        .order("created_at", { ascending: false })
    : { data: null };

  const negotiatedCharges = (negotiatedChargesRaw ?? []) as ChargeRow[];

  const { data: carriers } = await supabase
    .from("carrier_profiles")
    .select("user_id, carrier_type, operating_towns, delivery_methods, vehicle_type, profile_description")
    .eq("approval_status", "approved")
    .eq("active_status", true);

  async function calculateQuote() {
    "use server";

    const supabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) redirect("/login");

    const { data: assignedCarrier } = await supabase
      .from("delivery_assignments")
      .select("carrier_user_id")
      .eq("delivery_request_id", id)
      .in("assignment_status", ["pending_carrier_confirmation", "accepted"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!assignedCarrier?.carrier_user_id) {
      redirect(`/deliveries/${id}?error=carrier-required-for-quote`);
    }

    const { data: carrierProfile } = await supabase
      .from("carrier_profiles")
      .select("vehicle_type")
      .eq("user_id", assignedCarrier.carrier_user_id)
      .maybeSingle();

    const transportMethod = normalizeTransportMethod(carrierProfile?.vehicle_type);
    if (!transportMethod) {
      redirect(`/deliveries/${id}?error=unsupported-transport-method`);
    }

    const { data: routeStops } = await supabase
      .from("delivery_stops")
      .select("stop_type, latitude, longitude")
      .eq("delivery_request_id", id);

    const pickup = routeStops?.find((stop) => stop.stop_type === "pickup");
    const destination = routeStops?.find((stop) => stop.stop_type === "destination");

    if (!pickup?.latitude || !pickup?.longitude || !destination?.latitude || !destination?.longitude) {
      redirect(`/deliveries/${id}?error=route-points-required`);
    }

    let route;
    try {
      route = await getActualRouteDistanceMetres(
        transportMethod,
        { latitude: Number(pickup.latitude), longitude: Number(pickup.longitude) },
        { latitude: Number(destination.latitude), longitude: Number(destination.longitude) },
      );
    } catch (error) {
      const code = error instanceof Error ? error.message : "ROUTE_DISTANCE_NOT_AVAILABLE";
      redirect(`/deliveries/${id}?error=${encodeURIComponent(code)}`);
    }

    let admin;
    try {
      admin = createSupabaseAdminClient();
    } catch (error) {
      const code = error instanceof Error ? error.message : "SUPABASE_SERVICE_ROLE_NOT_CONFIGURED";
      redirect(`/deliveries/${id}?error=${encodeURIComponent(code)}`);
    }

    const { data: quoteId, error } = await admin.rpc("create_delivery_quote", {
      delivery_id: id,
      actual_route_distance_metres: route.metres,
      route_provider: route.provider,
      route_reference: route.providerReference,
    });

    if (error || !quoteId) {
      redirect(`/deliveries/${id}?error=quote-unavailable`);
    }

    revalidatePath(`/deliveries/${id}`);
    redirect(`/deliveries/${id}?saved=quote-created`);
  }

  async function confirmQuote() {
    "use server";

    if (!latestQuote) redirect(`/deliveries/${id}?error=quote-required`);

    const supabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) redirect("/login");

    const { error } = await supabase.rpc("confirm_delivery_quote", {
      delivery_id: id,
      quote_id: latestQuote.id,
    });

    if (error) redirect(`/deliveries/${id}?error=quote-confirmation-failed`);

    revalidatePath(`/deliveries/${id}`);
    redirect(`/deliveries/${id}?saved=quote-confirmed`);
  }

  async function agreeToCharge(formData: FormData) {
    "use server";

    const chargeId = String(formData.get("chargeId") ?? "");
    if (!chargeId) redirect(`/deliveries/${id}?error=charge-required`);

    const supabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) redirect("/login");

    const { error } = await supabase.rpc("sender_agree_negotiated_charge", {
      charge_id: chargeId,
    });

    if (error) redirect(`/deliveries/${id}?error=charge-agreement-failed`);

    revalidatePath(`/deliveries/${id}`);
    redirect(`/deliveries/${id}?saved=charge-agreed`);
  }

  async function selectCarrier(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) redirect("/login");

    const carrierUserId = String(formData.get("carrierUserId") ?? "");
    if (!carrierUserId) redirect(`/deliveries/${id}?error=carrier-required`);

    const { data: ownedDelivery } = await supabase
      .from("delivery_requests")
      .select("id, current_status")
      .eq("id", id)
      .eq("sender_user_id", currentUser.id)
      .maybeSingle();

    if (!ownedDelivery || ownedDelivery.current_status !== "draft") {
      redirect(`/deliveries/${id}?error=carrier-selection-unavailable`);
    }

    const { data: carrier } = await supabase
      .from("carrier_profiles")
      .select("user_id")
      .eq("user_id", carrierUserId)
      .eq("approval_status", "approved")
      .eq("active_status", true)
      .maybeSingle();

    if (!carrier) redirect(`/deliveries/${id}?error=carrier-unavailable`);

    const { error: assignmentError } = await supabase
      .from("delivery_assignments")
      .insert({
        delivery_request_id: id,
        carrier_user_id: carrierUserId,
        selected_by_user_id: currentUser.id,
        assignment_status: "pending_carrier_confirmation",
      });

    if (assignmentError) redirect(`/deliveries/${id}?error=assignment-failed`);

    await supabase
      .from("delivery_requests")
      .update({ current_status: "carrier_selected" })
      .eq("id", id)
      .eq("sender_user_id", currentUser.id)
      .eq("current_status", "draft");

    revalidatePath(`/deliveries/${id}`);
    redirect(`/deliveries/${id}?saved=carrier-selected`);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/deliveries" className="text-sm font-semibold text-emerald-700">← Back to deliveries</Link>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">Tracking</p>
        <h1 className="mt-2 text-3xl font-bold">{delivery.tracking_number}</h1>
        <p className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
          {delivery.current_status.replaceAll("_", " ")}
        </p>

        {query.saved === "quote-created" ? (
          <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
            Price estimate created.
          </p>
        ) : null}

        {query.error ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800" role="alert">
            {query.error === "carrier-required-for-quote"
              ? "Select and confirm a carrier before calculating the price."
              : query.error === "unsupported-transport-method"
                ? "The carrier transport method is not supported by the approved pricing rules."
                : query.error === "ROUTING_PROVIDER_NOT_CONFIGURED"
                  ? "Route distance is unavailable until the OpenRouteService key is configured on the server."
                  : query.error === "ROUTE_DISTANCE_NOT_AVAILABLE"
                    ? "A road route could not be obtained. No price was created."
                    : query.error === "SUPABASE_SERVICE_ROLE_NOT_CONFIGURED"
                      ? "The server pricing service is not configured."
                      : query.error === "quote-unavailable"
                        ? "A price estimate is unavailable because no active pricing configuration exists."
                        : "The quote could not be created."}
          </p>
        ) : null}

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">Method</dt>
            <dd className="font-semibold">{delivery.delivery_method.replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Parcel size</dt>
            <dd className="font-semibold">{delivery.parcel_size || "Not specified"}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Weight</dt>
            <dd className="font-semibold">{delivery.weight_kg ? `${delivery.weight_kg} kg` : "Not specified"}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Created</dt>
            <dd className="font-semibold">{new Date(delivery.created_at).toLocaleString()}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <h2 className="font-bold">Parcel</h2>
          <p className="mt-2 text-slate-600">{delivery.parcel_description}</p>
        </div>

        <div className="mt-6">
          <h2 className="font-bold">Estimated price</h2>
          {latestQuote ? (
            <div className="mt-3 rounded-xl border border-slate-200 p-4">
              <p className="text-2xl font-bold">KES {(Number(latestQuote.original_calculated_price_cents) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              <p className="mt-1 text-sm capitalize text-slate-600">{latestQuote.quote_status} quote</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                <div><dt>Base fee</dt><dd className="font-semibold text-slate-900">KES {(Number(latestQuote.base_fee_cents) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}</dd></div>
                <div><dt>Distance charge</dt><dd className="font-semibold text-slate-900">KES {(Number(latestQuote.distance_charge_cents) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}</dd></div>
                <div><dt>Transport</dt><dd className="font-semibold text-slate-900">{latestQuote.transport_method}</dd></div>
                <div><dt>Transport rate</dt><dd className="font-semibold text-slate-900">KES {(Number(latestQuote.distance_rate_cents_per_km) / 100).toFixed(2)} / km</dd></div>
              </dl>
              <p className="mt-3 text-xs text-slate-500">Actual route distance: {(Number(latestQuote.actual_route_distance_metres) / 1000).toFixed(3)} km</p>
              <p className="text-xs text-slate-500">Minimum billable distance: {(Number(latestQuote.minimum_billable_distance_metres) / 1000).toFixed(3)} km</p>
              <p className="text-xs text-slate-500">Billable distance: {(Number(latestQuote.billable_distance_metres) / 1000).toFixed(3)} km</p>
              {latestQuote.valid_until ? <p className="text-xs text-slate-500">Valid until {new Date(latestQuote.valid_until).toLocaleString()}</p> : null}
              {latestQuote.quote_status !== "confirmed" && latestQuote.quote_status !== "revised" ? (
                <form action={confirmQuote} className="mt-3">
                  <button className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-700">Confirm this quote</button>
                </form>
              ) : (
                <p className="mt-3 text-sm font-semibold text-emerald-700">Quote confirmed: KES {(Number(latestQuote.final_agreed_price_cents) / 100).toFixed(2)}</p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No price estimate is available yet.</p>
          )}
          <form action={calculateQuote} className="mt-3">
            <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Calculate estimate</button>
          </form>
        </div>

        <div className="mt-6">
          <h2 className="font-bold">Negotiated additional charges</h2>
          {negotiatedCharges?.length ? (
            <div className="mt-3 space-y-3">
              {negotiatedCharges.map((charge) => (
                <article key={charge.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-bold">KES {(Number(charge.proposed_amount_cents) / 100).toFixed(2)}</p>
                  <p className="mt-1 text-sm text-slate-600">{charge.reason}</p>
                  <p className="mt-2 text-xs capitalize text-slate-500">Status: {charge.status.replaceAll("_", " ")}</p>
                  {!charge.sender_agreed_at && charge.status !== "approved" ? (
                    <form action={agreeToCharge} className="mt-3">
                      <input type="hidden" name="chargeId" value={charge.id} />
                      <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Agree to this charge</button>
                    </form>
                  ) : (
                    <p className="mt-2 text-xs text-emerald-700">Sender agreement recorded</p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No additional charges proposed.</p>
          )}
        </div>

        <div className="mt-6">
          <h2 className="font-bold">Carrier</h2>
          {assignment ? (
            <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              Assignment status: <strong>{assignment.assignment_status.replaceAll("_", " ")}</strong>
            </p>
          ) : delivery.current_status === "draft" ? (
            <div className="mt-3 space-y-3">
              {carriers?.length ? carriers.map((carrier) => (
                <form key={carrier.user_id} action={selectCarrier} className="rounded-xl border border-slate-200 p-4">
                  <input type="hidden" name="carrierUserId" value={carrier.user_id} />
                  <p className="font-bold">{carrier.profile_description || "Approved carrier"}</p>
                  <p className="mt-1 text-sm text-slate-600">{carrier.carrier_type?.replaceAll("_", " ") || "Carrier"}</p>
                  {carrier.operating_towns?.length ? <p className="mt-1 text-sm text-slate-600">Areas: {carrier.operating_towns.join(", ")}</p> : null}
                  {carrier.delivery_methods?.length ? <p className="mt-1 text-sm text-slate-600">Methods: {carrier.delivery_methods.join(", ").replaceAll("_", " ")}</p> : null}
                  <button className="mt-3 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Select carrier</button>
                </form>
              )) : (
                <p className="text-sm text-slate-600">No approved carriers are currently available.</p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">Carrier selection is no longer available for this delivery.</p>
          )}
        </div>

        <div className="mt-6">
          <h2 className="font-bold">Journey</h2>
          <div className="mt-3 space-y-3">
            {stops?.map((stop) => (
              <div key={`${stop.stop_type}-${stop.sequence_number}`} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">{stop.stop_type}</p>
                <p className="mt-1 font-semibold">{stop.location_name}</p>
                {stop.instructions ? <p className="text-sm text-slate-600">Nearest landmark: {stop.instructions}</p> : null}
                {stop.latitude && stop.longitude ? <p className="mt-1 text-xs text-slate-500">Pinned: {stop.latitude}, {stop.longitude}</p> : null}
                {stop.contact_name ? <p className="mt-1 text-sm text-slate-600">Receiver: {stop.contact_name}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
