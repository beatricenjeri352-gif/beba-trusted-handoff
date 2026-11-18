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
    .select("stop_type, sequence_number, location_name, town, contact_name, contact_phone")
    .eq("delivery_request_id", delivery.id)
    .order("sequence_number", { ascending: true });

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
          <h2 className="font-bold">Journey</h2>
          <div className="mt-3 space-y-3">
            {stops?.map((stop) => (
              <div key={`${stop.stop_type}-${stop.sequence_number}`} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">{stop.stop_type}</p>
                <p className="mt-1 font-semibold">{stop.location_name}</p>
                {stop.town ? <p className="text-sm text-slate-600">{stop.town}</p> : null}
                {stop.contact_name ? <p className="mt-1 text-sm text-slate-600">Receiver: {stop.contact_name}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
