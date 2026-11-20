"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Account created. Check your email if confirmation is required, then sign in.");
        setMode("login");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage(error.message);
      } else {
        router.push("/deliveries");
        router.refresh();
      }
    }

    setLoading(false);
  }

  async function sendPasswordReset() {
    if (!email) {
      setMessage("Enter your Gmail or email address first.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setMessage(error ? error.message : "Password reset instructions were sent to your email.");
    setLoading(false);
  }

  return (
    <PageShell width="auth" center>
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-sm font-semibold text-emerald-700">Beba</p>
        <h1 className="mt-2 text-3xl font-bold">
          {mode === "login" ? "Sign in" : "Create account"}
        </h1>

        <div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "login" ? "bg-white shadow-sm" : "text-slate-600"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "signup" ? "bg-white shadow-sm" : "text-slate-600"}`}
          >
            Create account
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          {mode === "signup" ? (
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="full-name">Full name</label>
              <input
                id="full-name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
                required
              />
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="email">Gmail or email address</label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@gmail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
              required
            />
          </div>

          <button disabled={loading} className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-60">
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        {mode === "login" ? (
          <button type="button" onClick={sendPasswordReset} className="mt-4 w-full text-sm font-semibold text-slate-600">
            Forgot password?
          </button>
        ) : null}

        {message ? <p className="mt-4 text-sm text-amber-700" role="status">{message}</p> : null}
      </section>
    </PageShell>
  );
}
