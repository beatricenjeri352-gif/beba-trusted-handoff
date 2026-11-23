"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function openNotification(formData: FormData) {
  const notificationId = formData.get("notificationId");
  if (typeof notificationId !== "string" || !notificationId) {
    redirect("/deliveries?notificationError=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notification, error: lookupError } = await supabase
    .from("sender_notifications")
    .select("delivery_request_id, read_at")
    .eq("id", notificationId)
    .eq("sender_user_id", user.id)
    .maybeSingle();

  if (lookupError || !notification) {
    console.error("Notification lookup failed", lookupError);
    redirect("/deliveries?notificationError=unavailable");
  }

  if (!notification.read_at) {
    const { data: updated, error } = await supabase
      .from("sender_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("sender_user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error || !updated) {
      console.error("Marking notification read failed", error);
      redirect("/deliveries?notificationError=unavailable");
    }
  }

  revalidatePath("/deliveries");
  redirect(`/deliveries/${notification.delivery_request_id}`);
}
