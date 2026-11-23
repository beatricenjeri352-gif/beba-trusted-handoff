"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOut(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Sign out failed", error);
    return "Could not sign out. Please try again.";
  }

  redirect("/login");
}
