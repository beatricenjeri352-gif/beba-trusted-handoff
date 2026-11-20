import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import DeliveryLocationPickerLoader from "@/components/delivery-location-picker-loader";
import { ProfileSwitcher } from "@/components/profile-switcher";

function normalizePhone(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 9) return `254${digits}`;
  return null;
}

export default async function SenderPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; tracking?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, phone_number, email")
    .eq("id", user.id)
    .maybeSingle();

  const { data: deliveries } = await supabase
    .from("delivery_requests")
    .select("id, tracking_number, delivery_method, parcel_description, current_status, created_at")
    .eq("sender_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  async function createDelivery(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) redirect("/login");

    const deliveryMethod = String(formData.get("deliveryMethod") ?? "within_town");
    const parcelDescription = String(formData.get("parcelDescription") ?? "").trim();
    const parcelSize = String(formData.get("parcelSize") ?? "").trim() || null;
    const weightValue = String(formData.get("weightKg") ?? "").trim();
    const weightKg = weightValue ? Number(weightValue) : null;
    const pickupLocation = String(formData.get("pickupLocation") ?? "").trim();
    const pickupLandmark = String(formData.get("pickupLandmark") ?? "").trim();
    const pickupLatitude = String(formData.get("pickupLatitude") ?? "").trim();
    const pickupLongitude = String(formData.get("pickupLongitude") ?? "").trim();
    const destinationLocation = String(formData.get("destinationLocation") ?? "").trim();
    const destinationLandmark = String(formData.get("destinationLandmark") ?? "").trim();
    const destinationLatitude = String(formData.get("destinationLatitude") ?? "").trim();
    const destinationLongitude = String(formData.get("destinationLongitude") ?? "").trim();
    const receiverName = String(formData.get("receiverName") ?? "").trim();
    const receiverPhone = String(formData.get("receiverPhone") ?? "").trim();

    if (!parcelDescription || !pickupLocation || !destinationLocation) {
      redirect("/deliveries?error=delivery-required");
    }

    if (!pickupLatitude || !pickupLongitude || !destinationLatitude || !destinationLongitude) {
      redirect("/deliveries?error=location-pin-required");
    }

    if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 0)) {
      redirect("/deliveries?error=invalid-weight");
    }

    const normalizedReceiverPhone = receiverPhone ? normalizePhone(receiverPhone) : null;
    if (receiverPhone && !normalizedReceiverPhone) {
      redirect("/deliveries?error=invalid-receiver-phone");
    }

    const { data: delivery, error: deliveryError } = await supabase
      .from("delivery_requests")
      .insert({
        tracking_number: "",
        sender_user_id: currentUser.id,
        delivery_method: deliveryMethod,
        parcel_description: parcelDescription,
        parcel_size: parcelSize,
        weight_kg: weightKg,
        current_status: "draft",
      })
      .select("id, tracking_number")
      .single();

    if (deliveryError || !delivery) {
      console.error("Delivery insert failed", deliveryError);
      const reason = deliveryError?.code || "unknown";
      redirect(`/deliveries?error=delivery-save-failed&reason=${encodeURIComponent(reason)}`);
    }

    const { error: stopsError } = await supabase.from("delivery_stops").insert([
      {
        delivery_request_id: delivery.id,
        stop_type: "pickup",
        sequence_number: 1,
        location_name: pickupLocation,
        address: pickupLocation,
        latitude: Number(pickupLatitude),
        longitude: Number(pickupLongitude),
        instructions: pickupLandmark || null,
      },
      {
        delivery_request_id: delivery.id,
        stop_type: "destination",
        sequence_number: 1,
        location_name: destinationLocation,
        address: destinationLocation,
        latitude: Number(destinationLatitude),
        longitude: Number(destinationLongitude),
        instructions: destinationLandmark || null,
        contact_name: receiverName || null,
        contact_phone: normalizedReceiverPhone,
      },
    ]);

    if (stopsError) {
      console.error("Delivery stops insert failed", stopsError);
      await supabase.from("delivery_requests").delete().eq("id", delivery.id);
      const reason = stopsError.code || "unknown";
      redirect(`/deliveries?error=delivery-save-failed&reason=${encodeURIComponent(reason)}`);
    }

    revalidatePath("/deliveries");
    redirect(`/deliveries?saved=1&tracking=${delivery.tracking_number}`);
  }

  async function signOut() {
    "use server";

    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <ProfileSwitcher current="sender" />
      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Sender workspace</p>
          <h1 className="mt-2 text-3xl font-bold">Deliveries</h1>
        </div>
        <form action={signOut}>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Sign out</button>
        </form>
      </div>

      {params.saved === "1" ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
          Delivery created{params.tracking ? ` — ${params.tracking}` : ""}.
        </p>
      ) : null}

      {params.error ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800" role="alert">
          {params.error === "delivery-required"
            ? "Complete the pickup, destination, and parcel fields."
            : params.reason
              ? `The delivery could not be saved. Database code: ${params.reason}.`
            : params.error === "location-pin-required"
              ? "Pin both the pickup point and delivery destination on the map or use your current location."
            : params.error === "invalid-weight"
              ? "Enter a valid weight."
              : params.error === "invalid-receiver-phone"
                ? "Enter a valid Kenyan receiver phone number."
                : "The delivery could not be saved. Please try again."}
        </p>
      ) : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <form action={createDelivery} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Create a delivery request</h2>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="deliveryMethod">Delivery method</label>
            <select id="deliveryMethod" name="deliveryMethod" className="w-full rounded-xl border border-slate-300 px-4 py-3">
              <option value="within_town">Within town</option>
              <option value="to_stage">To a stage</option>
              <option value="intertown">Inter-town</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="parcelDescription">Parcel description</label>
            <textarea id="parcelDescription" name="parcelDescription" rows={3} className="w-full rounded-xl border border-slate-300 px-4 py-3" required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="parcelSize">Parcel size</label>
              <select id="parcelSize" name="parcelSize" className="w-full rounded-xl border border-slate-300 px-4 py-3">
                <option value="">Select size</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="weightKg">Weight (kg)</label>
              <input id="weightKg" name="weightKg" type="number" min="0" step="0.1" className="w-full rounded-xl border border-slate-300 px-4 py-3" />
            </div>
          </div>

          <DeliveryLocationPickerLoader name="pickup" label="Pickup location" locationName="" landmark="" />

          <DeliveryLocationPickerLoader name="destination" label="Delivery destination" locationName="" landmark="" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="receiverName">Receiver name</label>
              <input id="receiverName" name="receiverName" type="text" className="w-full rounded-xl border border-slate-300 px-4 py-3" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="receiverPhone">Receiver phone</label>
              <input id="receiverPhone" name="receiverPhone" type="tel" inputMode="tel" placeholder="0712 345 678" className="w-full rounded-xl border border-slate-300 px-4 py-3" />
            </div>
          </div>

          <button className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white">Create delivery</button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 p-5">
            <h2 className="text-lg font-bold">Recent deliveries</h2>
            <div className="mt-4 space-y-3">
              {deliveries?.length ? deliveries.map((delivery) => (
                <a key={delivery.id} href={`/deliveries/${delivery.id}`} className="block rounded-xl bg-slate-50 p-4 hover:bg-slate-100">
                  <p className="font-semibold">{delivery.tracking_number}</p>
                  <p className="mt-1 text-sm text-slate-600">{delivery.parcel_description}</p>
                  <p className="mt-2 text-xs font-medium text-emerald-700">{delivery.current_status.replaceAll("_", " ")}</p>
                </a>
              )) : (
                <p className="text-sm text-slate-600">No deliveries created yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <h2 className="text-lg font-bold">Account profile</h2>
            <p className="mt-2 text-sm text-slate-600">{profile?.full_name || "Name not set"}</p>
            <p className="text-sm text-slate-600">{profile?.email ?? user.email}</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
