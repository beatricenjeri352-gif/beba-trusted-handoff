import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getActualRouteDistanceMetres } from "@/lib/pricing/google-maps";
import { calculateWalkingDeliveryQuote } from "@/lib/pricing/walking-bands";
import { getCarrierDistancesToPickup } from "@/lib/carrier/distance";
import { describeCarrierDistance, describeRatings, validateReview } from "@/lib/carrier/location";

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

type WalkingPricePreview =
  | { status: "missing_points" }
  | { status: "unavailable"; message: string }
  | { status: "too_far"; distanceMetres: number }
  | {
      status: "priced";
      distanceMetres: number;
      feeCents: number;
      commissionCents: number;
      carrierEarningsCents: number;
    };

interface RoutePoint {
  latitude: number | string | null;
  longitude: number | string | null;
}

// Read-only preview: uses the Google walking route and the band table, and stores nothing.
async function getWalkingPricePreview(
  pickup: RoutePoint | undefined,
  destination: RoutePoint | undefined,
): Promise<WalkingPricePreview> {
  if (pickup?.latitude == null || pickup?.longitude == null || destination?.latitude == null || destination?.longitude == null) {
    return { status: "missing_points" };
  }

  let route;
  try {
    route = await getActualRouteDistanceMetres(
      "walking",
      { latitude: Number(pickup.latitude), longitude: Number(pickup.longitude) },
      { latitude: Number(destination.latitude), longitude: Number(destination.longitude) },
    );
  } catch (error) {
    return {
      status: "unavailable",
      message: error instanceof Error && error.message === "ROUTING_PROVIDER_NOT_CONFIGURED"
        ? "Route distance is unavailable until the Google Maps key is configured on the server."
        : "Estimate unavailable. A walking route could not be loaded, so no price is shown.",
    };
  }

  const result = calculateWalkingDeliveryQuote(route.metres);
  if (result.status === "too_far_to_walk") {
    return { status: "too_far", distanceMetres: route.metres };
  }

  return {
    status: "priced",
    distanceMetres: route.metres,
    feeCents: result.deliveryFeeCents,
    commissionCents: result.commissionCents,
    carrierEarningsCents: result.carrierEarningsCents,
  };
}

function formatKes(cents: number): string {
  return `KES ${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
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
    .order("id", { ascending: false })
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

  const pricePreview = await getWalkingPricePreview(
    stops?.find((stop) => stop.stop_type === "pickup"),
    stops?.find((stop) => stop.stop_type === "destination"),
  );

  const { data: carriers } = await supabase
    .from("carrier_profiles")
    .select("user_id, carrier_type, operating_towns, delivery_methods, vehicle_type, profile_description")
    .eq("approval_status", "approved")
    .eq("active_status", true);

  const carrierIds = carriers?.map((carrier) => carrier.user_id) ?? [];
  const pickupStop = stops?.find((stop) => stop.stop_type === "pickup");
  const carrierDistances = delivery.current_status === "draft" && carrierIds.length && pickupStop?.latitude && pickupStop?.longitude
    ? await getCarrierDistancesToPickup(carrierIds, {
        latitude: Number(pickupStop.latitude),
        longitude: Number(pickupStop.longitude),
      })
    : new Map<string, number | null>();

  const { data: reviewRows } = carrierIds.length
    ? await supabase.from("delivery_reviews").select("carrier_user_id, rating").in("carrier_user_id", carrierIds)
    : { data: null };

  const ratingsByCarrier = new Map<string, number[]>();
  for (const row of reviewRows ?? []) {
    ratingsByCarrier.set(row.carrier_user_id, [...(ratingsByCarrier.get(row.carrier_user_id) ?? []), Number(row.rating)]);
  }

  const rankedCarriers = [...(carriers ?? [])].sort((a, b) => {
    const distanceA = carrierDistances.get(a.user_id);
    const distanceB = carrierDistances.get(b.user_id);
    if (distanceA == null || distanceB == null) return Number(distanceA == null) - Number(distanceB == null);
    return distanceA - distanceB;
  });

  const { data: existingReview } = await supabase
    .from("delivery_reviews")
    .select("rating, comment")
    .eq("delivery_request_id", delivery.id)
    .maybeSingle();

  const { data: latestAssignment } = await supabase
    .from("delivery_assignments")
    .select("carrier_user_id")
    .eq("delivery_request_id", delivery.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const completedCarrierId = latestAssignment?.carrier_user_id ?? null;

  const { data: openBookings } = await supabase
    .from("carrier_bookings")
    .select("id, carrier_user_id, created_at")
    .eq("sender_user_id", user.id)
    .eq("booking_status", "pending_carrier_confirmation")
    .order("created_at", { ascending: false });

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
        "walking",
        { latitude: Number(pickup.latitude), longitude: Number(pickup.longitude) },
        { latitude: Number(destination.latitude), longitude: Number(destination.longitude) },
      );
    } catch (error) {
      const code = error instanceof Error && error.message === "ROUTING_PROVIDER_NOT_CONFIGURED"
        ? error.message
        : "ROUTE_DISTANCE_NOT_AVAILABLE";
      redirect(`/deliveries/${id}?error=${code}`);
    }

    if (calculateWalkingDeliveryQuote(route.metres).status === "too_far_to_walk") {
      redirect(`/deliveries/${id}?error=too-far-to-walk`);
    }

    let admin;
    try {
      admin = createSupabaseAdminClient();
    } catch (error) {
      const code = error instanceof Error ? error.message : "SUPABASE_SERVICE_ROLE_NOT_CONFIGURED";
      redirect(`/deliveries/${id}?error=${encodeURIComponent(code)}`);
    }

    const { data: quoteId, error } = await admin.rpc("create_walking_delivery_quote", {
      delivery_id: id,
      walking_distance_metres: route.metres,
      route_provider: route.provider,
      route_reference: route.providerReference,
    });

    if (error?.message?.includes("TOO_FAR_TO_WALK")) {
      redirect(`/deliveries/${id}?error=too-far-to-walk`);
    }

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
      expected_final_price_cents: latestQuote.final_agreed_price_cents,
    });

    if (error) {
      console.error("Delivery quote confirmation failed", error);
      redirect(`/deliveries/${id}?error=quote-confirmation-failed`);
    }

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

    const { error } = await supabase.rpc("create_carrier_booking", {
      p_carrier_user_id: carrierUserId,
      p_delivery_ids: [id],
    });

    if (error) {
      console.error("Carrier booking creation failed", error);
      redirect(`/deliveries/${id}?error=assignment-failed`);
    }

    revalidatePath(`/deliveries/${id}`);
    redirect(`/deliveries/${id}?saved=carrier-selected`);
  }

  async function addToBooking(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) redirect("/login");

    const bookingId = String(formData.get("bookingId") ?? "");
    if (!bookingId) redirect(`/deliveries/${id}?error=booking-required`);

    const { error } = await supabase.rpc("add_delivery_to_carrier_booking", {
      p_booking_id: bookingId,
      p_delivery_id: id,
    });

    if (error) {
      console.error("Adding delivery to carrier booking failed", error);
      redirect(`/deliveries/${id}?error=booking-add-failed`);
    }

    revalidatePath(`/deliveries/${id}`);
    redirect(`/deliveries/${id}?saved=added-to-booking`);
  }

  async function submitDeliveryReview(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) redirect("/login");

    const review = validateReview({ rating: formData.get("rating"), comment: formData.get("comment") });
    if (!review.ok) redirect(`/deliveries/${id}?error=${review.error}`);

    const { error } = await supabase.from("delivery_reviews").insert({
      delivery_request_id: id,
      sender_user_id: currentUser.id,
      carrier_user_id: String(formData.get("carrierUserId") ?? ""),
      rating: review.rating,
      comment: review.comment,
    });

    if (error) {
      console.error("Saving delivery review failed", error);
      redirect(`/deliveries/${id}?error=review-not-saved`);
    }

    revalidatePath(`/deliveries/${id}`);
    redirect(`/deliveries/${id}?saved=review-created`);
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
              : query.error === "too-far-to-walk"
                ? "Too far to walk. Over 3 km, choose a car, tuktuk, or boda instead."
                : query.error === "ROUTING_PROVIDER_NOT_CONFIGURED"
                  ? "Route distance is unavailable until the Google Maps key is configured on the server."
                  : query.error === "ROUTE_DISTANCE_NOT_AVAILABLE"
                    ? "A road route could not be obtained. No price was created."
                    : query.error === "SUPABASE_SERVICE_ROLE_NOT_CONFIGURED"
                      ? "The server pricing service is not configured."
                      : query.error === "quote-unavailable"
                        ? "A price estimate could not be created. Confirm the carrier, route, and pricing are still available."
                        : query.error === "review-not-saved"
                          ? "Your review could not be saved. Only the sender of a completed delivery can review its carrier, once."
                          : query.error === "RATING_INVALID" || query.error === "COMMENT_TOO_LONG"
                            ? "Choose a rating from 1 to 5, and keep the comment under 500 characters."
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
          <h2 className="font-bold">Walking price preview</h2>
          {pricePreview.status === "priced" ? (
            <div className="mt-3 rounded-xl border border-slate-200 p-4">
              <p className="text-2xl font-bold">{formatKes(pricePreview.feeCents)}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                <div><dt>Walking distance</dt><dd className="font-semibold text-slate-900">{(pricePreview.distanceMetres / 1000).toFixed(2)} km</dd></div>
                <div><dt>Delivery fee</dt><dd className="font-semibold text-slate-900">{formatKes(pricePreview.feeCents)}</dd></div>
                <div><dt>Beba commission (10%)</dt><dd className="font-semibold text-slate-900">{formatKes(pricePreview.commissionCents)}</dd></div>
                <div><dt>Carrier earns</dt><dd className="font-semibold text-slate-900">{formatKes(pricePreview.carrierEarningsCents)}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-slate-500">Shown before choosing a carrier. Agreement is between you and the carrier.</p>
            </div>
          ) : pricePreview.status === "too_far" ? (
            <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm font-medium text-amber-800">
              Too far to walk ({(pricePreview.distanceMetres / 1000).toFixed(2)} km). Choose a car, tuktuk, or boda instead.
            </p>
          ) : pricePreview.status === "unavailable" ? (
            <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm font-medium text-amber-800">{pricePreview.message}</p>
          ) : (
            <p className="mt-3 text-sm text-slate-600">Set the pickup and drop-off points to see the walking price.</p>
          )}
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
              {latestQuote.quote_status === "estimated" || latestQuote.quote_status === "revised" ? (
                <form action={confirmQuote} className="mt-3">
                  <button className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-700">Confirm this quote</button>
                </form>
              ) : latestQuote.quote_status === "confirmed" ? (
                <p className="mt-3 text-sm font-semibold text-emerald-700">Quote confirmed: KES {(Number(latestQuote.final_agreed_price_cents) / 100).toFixed(2)}</p>
              ) : (
                <p className="mt-3 text-sm font-semibold text-amber-700">This quote is no longer available for confirmation.</p>
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
              {openBookings?.length ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="font-bold">Add to an open carrier booking</p>
                  <p className="mt-1 text-sm text-slate-600">Send this delivery with a carrier you already booked for another delivery.</p>
                  <div className="mt-3 space-y-2">
                    {openBookings.map((booking) => {
                      const bookedCarrier = carriers?.find((carrier) => carrier.user_id === booking.carrier_user_id);
                      return (
                        <form key={booking.id} action={addToBooking} className="flex items-center justify-between gap-3">
                          <input type="hidden" name="bookingId" value={booking.id} />
                          <span className="text-sm text-slate-700">{bookedCarrier?.profile_description || "Booked carrier"}</span>
                          <button className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800">Add to booking</button>
                        </form>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {rankedCarriers.length ? rankedCarriers.map((carrier) => (
                <form key={carrier.user_id} action={selectCarrier} className="rounded-xl border border-slate-200 p-4">
                  <input type="hidden" name="carrierUserId" value={carrier.user_id} />
                  <p className="font-bold">{carrier.profile_description || "Approved carrier"}</p>
                  <p className="mt-1 text-sm text-slate-600">{carrier.carrier_type?.replaceAll("_", " ") || "Carrier"}</p>
                  {delivery.current_status === "draft" ? (
                    <p className="mt-1 text-sm font-semibold text-emerald-800">{describeCarrierDistance(carrierDistances, carrier.user_id)}</p>
                  ) : null}
                  <p className="mt-1 text-sm text-slate-600">Rating: {describeRatings(ratingsByCarrier.get(carrier.user_id))}</p>
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

        {delivery.current_status === "completed" && completedCarrierId ? (
          <div className="mt-6 rounded-xl border border-slate-200 p-4">
            <h2 className="font-bold">Rate your carrier</h2>
            {existingReview ? (
              <p className="mt-2 text-sm text-slate-600">
                You rated this delivery {existingReview.rating}/5.{existingReview.comment ? ` "${existingReview.comment}"` : ""}
              </p>
            ) : (
              <form action={submitDeliveryReview} className="mt-3 space-y-3">
                <input type="hidden" name="carrierUserId" value={completedCarrierId} />
                <label className="block text-sm font-semibold text-slate-700">
                  Stars
                  <select name="rating" required defaultValue="5" className="mt-1 block rounded-lg border border-slate-300 px-3 py-2">
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>{value} star{value === 1 ? "" : "s"}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Comment (optional)
                  <textarea name="comment" maxLength={500} rows={3} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Submit review</button>
              </form>
            )}
          </div>
        ) : null}

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
