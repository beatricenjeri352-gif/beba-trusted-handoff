import { AuthForm } from "@/components/auth-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <AuthForm
      initialMode={params.mode === "signup" ? "signup" : "login"}
      initialError={params.error === "google" ? "Google sign-in could not be completed. Please try again." : ""}
      signedInEmail={user ? user.email ?? user.phone ?? "your account" : null}
    />
  );
}
