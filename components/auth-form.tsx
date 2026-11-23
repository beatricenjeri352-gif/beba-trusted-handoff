"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthCard, authInputClass } from "@/components/ui/modern-animated-sign-in";
import { PageShell } from "@/components/page-shell";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "login" | "choose" | "signup";
type RegistrationRole = "sender" | "carrier";

export function AuthForm({ initialMode, initialError }: {
  initialMode: "login" | "signup";
  initialError: string;
}) {
  const router = useRouter();
  const [supabase] = useState(createSupabaseBrowserClient);
  const [mode, setMode] = useState<Mode>(initialMode === "signup" ? "choose" : "login");
  const [role, setRole] = useState<RegistrationRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(initialError);
  const [loading, setLoading] = useState(false);

  function changeMode(next: Mode) {
    setMode(next);
    setMessage("");
    if (next === "login") setRole(null);
  }

  function finishSignIn(destination: RegistrationRole | null = null) {
    router.push(destination === "carrier" ? "/jobs" : "/deliveries");
    router.refresh();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const address = email.trim();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: address,
          password,
          options: { data: { full_name: fullName.trim(), registration_role: role } },
        });
        if (error) {
          setMessage(error.message);
        } else if (data.session) {
          finishSignIn(role);
        } else {
          setMessage("Sign-up did not create a session. Email confirmation may still be required, or the account may already exist. Try signing in or contact support.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: address, password });
        if (error) setMessage(error.message);
        else finishSignIn();
      }
    } catch {
      setMessage("Unable to connect. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function googleSignIn() {
    setLoading(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback${mode === "signup" && role === "carrier" ? "?role=carrier" : ""}` },
      });
      if (error) {
        setMessage(`Google sign-in is unavailable: ${error.message}`);
        setLoading(false);
      }
    } catch {
      setMessage("Unable to connect to Google sign-in. Please try again.");
      setLoading(false);
    }
  }

  async function sendPasswordReset() {
    if (!email.trim()) {
      setMessage("Enter your email address first.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      setMessage(error ? error.message : "If an account exists for this email, reset instructions have been sent.");
    } catch {
      setMessage("Unable to send reset instructions. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell width="auth" center>
      <Link href="/" className="mb-6 inline-block self-start text-xl font-black tracking-tight text-emerald-800">beba<span className="text-amber-500">.</span></Link>
      <AuthCard>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Welcome to Beba</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
          {mode === "choose" ? "How will you use Beba?" : mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {mode === "choose" ? "Choose where you would like to start. You can use one account for both." : mode === "signup" ? `Register as a ${role}.` : "Sign in to continue to Beba."}
        </p>

        {mode === "choose" ? (
          <div className="mt-6 space-y-3">
            <button type="button" onClick={() => { setRole("sender"); changeMode("signup"); }} className="min-h-20 w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left hover:border-emerald-700">
              <span className="block font-bold text-emerald-900">Sender</span>
              <span className="mt-1 block text-sm text-slate-600">I want to send deliveries.</span>
            </button>
            <button type="button" onClick={() => { setRole("carrier"); changeMode("signup"); }} className="min-h-20 w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left hover:border-emerald-700">
              <span className="block font-bold text-emerald-900">Carrier</span>
              <span className="mt-1 block text-sm text-slate-600">I want to carry deliveries.</span>
            </button>
            <p className="pt-3 text-center text-sm text-slate-600">Already have an account? <button type="button" onClick={() => changeMode("login")} className="font-bold text-emerald-800">Sign in</button></p>
          </div>
        ) : null}

        {mode === "signup" ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <p className="font-bold">Verification status</p>
            <p>Direct sign-up is for testing and requires email confirmation to be disabled in Supabase. Face and ID checks are not available yet. Do not upload or send identity documents or photos.</p>
            <p className="mt-2">Your existing access stays the same. Carrier applications still require approval.</p>
            <button type="button" onClick={() => changeMode("choose")} className="mt-2 font-semibold underline">Change choice</button>
          </div>
        ) : null}

        {mode === "login" || mode === "signup" ? (
          <>
            <button type="button" disabled={loading} onClick={googleSignIn} className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60">
              <span aria-hidden="true" className="text-lg font-bold text-blue-600">G</span> Continue with Google
            </button>
            <div className="my-5 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-200" />or continue with email<span className="h-px flex-1 bg-slate-200" /></div>
          </>
        ) : null}

        {mode !== "choose" ? <form className="space-y-4" onSubmit={submit}>
          {mode === "signup" ? (
            <div>
              <label className="mb-2 block text-sm font-semibold" htmlFor="full-name">Full name</label>
              <input id="full-name" className={authInputClass} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            </div>
          ) : null}
          <>
              <div>
                <label className="mb-2 block text-sm font-semibold" htmlFor="email">Email address</label>
                <input id="email" className={authInputClass} type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold" htmlFor="password">Password</label>
                <div className="relative">
                  <input id="password" className={`${authInputClass} pr-14`} type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex min-w-12 items-center justify-center text-slate-600">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {mode === "signup" ? <p className="mt-2 text-xs text-slate-500">Use at least 8 characters.</p> : null}
              </div>
          </>
          <button disabled={loading} className="min-h-12 w-full rounded-xl bg-emerald-800 px-4 font-semibold text-white hover:bg-emerald-900 disabled:opacity-60">
            {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form> : null}

        {message ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="status">{message}</p> : null}
        {mode !== "choose" ? (
          <>
            {mode === "login" ? (
              <div className="mt-4 flex flex-wrap justify-between gap-3 text-sm font-semibold text-emerald-800">
                <button type="button" disabled={loading} onClick={sendPasswordReset}>Forgot password?</button>
              </div>
            ) : null}
            <p className="mt-5 text-center text-sm text-slate-600">
              {mode === "login" ? "New to Beba? " : "Already have an account? "}
              <button type="button" disabled={loading} onClick={() => changeMode(mode === "login" ? "choose" : "login")} className="font-bold text-emerald-800">{mode === "login" ? "Create account" : "Sign in"}</button>
            </p>
            <p className="mt-5 text-center text-xs leading-5 text-slate-500">Phone and username sign-in are not available yet. Phone verification will be added when SMS is integrated.</p>
          </>
        ) : null}
      </AuthCard>
    </PageShell>
  );
}
