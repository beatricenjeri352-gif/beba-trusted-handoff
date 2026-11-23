import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(url.searchParams.get("role") === "carrier" ? "/jobs" : "/deliveries", url.origin));
    } catch (error) {
      console.error("Google sign-in callback failed", error);
    }
  }
  return NextResponse.redirect(new URL("/login?error=google", url.origin));
}
