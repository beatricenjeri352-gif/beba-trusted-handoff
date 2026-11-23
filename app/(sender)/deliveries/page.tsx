import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccountMenu } from "@/components/account-menu";
import { PageShell } from "@/components/page-shell";
import { ProfileSwitcher } from "@/components/profile-switcher";
import { SenderHome } from "@/components/sender-home";
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

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("full_name, phone_number, email")
    .eq("id", user.id)
    .maybeSingle();

  const { data: deliveries, error: deliveriesError } = await supabase
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
  if (profileError) console.error("Loading sender profile failed", profileError);
  if (deliveriesError) console.error("Loading recent deliveries failed", deliveriesError);

  const authName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
  const fullName = profile?.full_name?.trim() || authName?.trim() || null;

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
        <AccountMenu
          profileDetails={
            <>
              <p>{fullName || (profileError ? "Name unavailable" : "Name not set")}</p>
              <p>{profile?.email ?? user.email}</p>
              {profileError ? <p className="mt-2">Profile details are unavailable.</p> : null}
            </>
          }
          recentDeliveries={
            deliveriesError ? (
              <p className="px-2">Recent deliveries are unavailable. Please try again later.</p>
            ) : deliveries?.length ? deliveries.map((delivery) => (
              <a key={delivery.id} href={`/deliveries/${delivery.id}`} className="block rounded-lg px-2 py-3 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-700">
                <p className="font-semibold text-slate-800">{delivery.tracking_number}</p>
                <p className="mt-1 break-words">{delivery.parcel_description}</p>
                <p className="mt-1 text-xs font-medium text-emerald-700">{delivery.current_status.replaceAll("_", " ")}</p>
              </a>
            )) : (
              <p className="px-2">No deliveries created yet.</p>
            )
          }
        >
          <ProfileSwitcher current="sender" />
        </AccountMenu>
      </div>
      {params.notificationError ? (
        <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          The notification could not be opened. Please try again.
        </p>
      ) : null}
      <SenderHome fullName={fullName} />
    </PageShell>
  );
}
