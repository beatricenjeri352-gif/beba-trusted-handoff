import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: assignment } = await (supabase as any)
    .from("delivery_assignments")
    .select("id, carrier_user_id, assignment_status")
    .eq("delivery_request_id", delivery.id)
    .in("assignment_status", ["pending_carrier_confirmation", "accepted"])
    .maybeSingle();

  const { data: carriers } = await supabase
    .from("carrier_profiles")
    .select("user_id, carrier_type, operating_towns, delivery_methods, vehicle_type, profile_description")
    .eq("approval_status", "approved")
    .eq("active_status", true);

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

    const { error: assignmentError } = await (supabase as any)
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
