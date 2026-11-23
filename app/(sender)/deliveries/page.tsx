import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccountMenu } from "@/components/account-menu";
import { DeliveryWizard } from "@/components/delivery-wizard";
import { PageShell } from "@/components/page-shell";
import { ProfileSwitcher } from "@/components/profile-switcher";
import { SenderNotifications, type SenderNotification } from "@/components/sender-notifications";

export default async function SenderPage({
  searchParams,
}: {
  searchParams: Promise<{ notificationError?: string }>;
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

  const [updates, unread, active] = await Promise.all([
    supabase.from("sender_notifications")
      .select("id, event_type, delivery_status, read_at, delivery_requests(tracking_number)")
      .eq("sender_user_id", user.id)
      .order("read_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false })
      .limit(20)
      .overrideTypes<SenderNotification[], { merge: false }>(),
    supabase.from("sender_notifications")
      .select("id", { count: "exact", head: true })
      .eq("sender_user_id", user.id)
      .is("read_at", null),
    supabase.from("delivery_requests")
      .select("id, tracking_number, current_status")
      .eq("sender_user_id", user.id)
      .not("current_status", "in", "(completed,cancelled,failed,returned)")
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);
  if (updates.error || unread.error) {
    console.error("Loading sender notifications failed", updates.error ?? unread.error);
  }
  if (active.error) console.error("Loading active deliveries failed", active.error);

  return (
    <PageShell width="medium">
      <div className="flex items-start justify-end gap-2">
        <SenderNotifications
          notifications={updates.data ?? []}
          activeDeliveries={active.data ?? []}
          unreadCount={unread.count ?? 0}
          unavailable={Boolean(updates.error || unread.error)}
          deliveriesUnavailable={Boolean(active.error)}
        />
        <AccountMenu><ProfileSwitcher current="sender" /></AccountMenu>
      </div>
      {params.notificationError ? (
        <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          The notification could not be opened. Please try again.
        </p>
      ) : null}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Sender workspace</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Deliveries</h1>
        </div>
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
