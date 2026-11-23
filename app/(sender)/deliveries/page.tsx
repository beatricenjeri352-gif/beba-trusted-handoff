import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DeliveryWizard } from "@/components/delivery-wizard";
import { PageShell } from "@/components/page-shell";
import { ProfileSwitcher } from "@/components/profile-switcher";

export default async function SenderPage() {
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

  async function signOut() {
    "use server";

    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <PageShell width="medium">
      <ProfileSwitcher current="sender" />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Sender workspace</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Deliveries</h1>
        </div>
        <form action={signOut} className="sm:shrink-0">
          <button className="min-h-11 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold sm:w-auto">Sign out</button>
        </form>
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <DeliveryWizard />

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
    </PageShell>
  );
}
