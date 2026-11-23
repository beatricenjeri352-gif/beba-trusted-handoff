import { AuthForm } from "@/components/auth-form";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthForm
      initialMode={params.mode === "signup" ? "signup" : "login"}
      initialError={params.error === "google" ? "Google sign-in could not be completed. Please try again." : ""}
    />
  );
}
