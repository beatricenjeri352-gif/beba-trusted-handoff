"use client";

import { ArrowRight, CircleCheck, Eye, EyeOff, Footprints, Package, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthScene, authPrimaryButtonClass, authSecondaryButtonClass } from "@/components/auth-scene";
import { authInputClass } from "@/components/ui/modern-animated-sign-in";
import { normalizeSignupPhone, normalizeUsername, validateSignup } from "@/lib/auth/validation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "login" | "choose" | "signup";
type RegistrationRole = "sender" | "carrier";
type LoginMethod = "email" | "phone";

const labelClass = "mb-2 block text-sm font-semibold text-slate-800";

const ROLE_OPTIONS: { value: RegistrationRole; title: string; description: string; Icon: LucideIcon }[] = [
  { value: "sender", title: "Send packages", description: "Send anything, anywhere in town.", Icon: Package },
  { value: "carrier", title: "Deliver & earn", description: "Carry deliveries and get paid.", Icon: Footprints },
];

function ComingSoon({ children }: { children: string }) {
  return (
    <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">Coming soon</span>
      {children}
    </p>
  );
}

export function AuthForm({ initialMode, initialError, signedInEmail }: {
  initialMode: "login" | "signup";
  initialError: string;
  signedInEmail: string | null;
}) {
  const router = useRouter();
  const [supabase] = useState(createSupabaseBrowserClient);
  const [currentEmail, setCurrentEmail] = useState(signedInEmail);
  const [mode, setMode] = useState<Mode>(initialMode === "signup" ? "choose" : "login");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("email");
  const [role, setRole] = useState<RegistrationRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(initialError);
  const [loading, setLoading] = useState(false);

  function changeMode(next: Mode) {
    setMode(next);
    setMessage("");
    if (next === "login") setRole(null);
  }

  function goBack() {
    if (mode === "signup") changeMode("choose");
    else router.push("/");
  }

  function finishSignIn(destination: RegistrationRole | null = null) {
    router.push(destination === "carrier" ? "/jobs" : "/deliveries");
    router.refresh();
  }

  async function signOutHere() {
    setLoading(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) setMessage("Could not sign out. Please try again.");
      else {
        setCurrentEmail(null);
        router.refresh();
      }
    } catch {
      setMessage("Unable to connect. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const address = email.trim();
    if (mode === "signup") {
      const problem = validateSignup({ fullName, email: address, phone, username, password });
      if (problem) {
        setMessage(problem);
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: address,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              registration_role: role,
              // Saved to public.users.phone_number by handle_new_auth_user(). Not verified yet.
              phone_number: normalizeSignupPhone(phone),
              username: username.trim() ? normalizeUsername(username) : null,
            },
          },
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

  const passwordField = (
    <div>
      <label className={labelClass} htmlFor="password">Password</label>
      <div className="relative">
        <input id="password" className={`${authInputClass} pr-14`} type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
        <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex min-w-12 items-center justify-center rounded-r-2xl text-slate-500 hover:text-emerald-800">
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      {mode === "signup" ? <p className="mt-2 text-xs text-slate-500">Use at least 8 characters.</p> : null}
    </div>
  );

  const statusMessage = message ? <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">{message}</p> : null;

  if (currentEmail) {
    return (
      <AuthScene illustration="wave" onBack={() => router.push("/")} backDisabled={loading}>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back <span aria-hidden="true">👋</span></h1>
        <p className="mt-2 text-slate-600">You&apos;re already signed in.</p>
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-lg font-bold uppercase text-white">
            {currentEmail.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Signed in as</p>
            <p className="break-words font-semibold text-emerald-950">{currentEmail}</p>
          </div>
        </div>
        <button type="button" disabled={loading} onClick={() => finishSignIn()} className={`${authPrimaryButtonClass} mt-6`}>
          Continue to my account <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <button type="button" disabled={loading} onClick={signOutHere} className="mt-4 min-h-11 w-full text-sm font-semibold text-emerald-800 hover:text-emerald-950 disabled:opacity-60">
          {loading ? "Signing out..." : initialMode === "signup" ? "Sign out and create a new account" : "Use a different account"}
        </button>
        {statusMessage}
      </AuthScene>
    );
  }

  const inSignupFlow = mode === "choose" || mode === "signup";

  return (
    <AuthScene illustration={inSignupFlow ? "handoff" : "wave"} onBack={goBack} backDisabled={loading}>
      {inSignupFlow ? (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Step {mode === "choose" ? 1 : 2} of 2</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5" aria-hidden="true">
            <span className="h-1.5 rounded-full bg-amber-400" />
            <span className={`h-1.5 rounded-full ${mode === "signup" ? "bg-amber-400" : "bg-slate-200"}`} />
          </div>
        </div>
      ) : null}

      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        {mode === "choose" ? "How will you use Beba?" : mode === "signup" ? "Create your account" : <>Welcome back <span aria-hidden="true">👋</span></>}
      </h1>
      <p className="mt-2 leading-6 text-slate-600">
        {mode === "choose"
          ? "Choose where you'd like to start. You can use one account for both."
          : mode === "signup"
            ? role === "carrier" ? "You're joining as a carrier. Deliver and earn." : "You're joining as a sender. Send anything, anywhere in town."
            : "Sign in to continue to Beba."}
      </p>

      {mode === "choose" ? (
        <div className="mt-6">
          <div role="radiogroup" aria-label="Account type" className="space-y-3">
            {ROLE_OPTIONS.map(({ value, title, description, Icon }) => {
              const selected = role === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setRole(value)}
                  className={`flex min-h-20 w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${selected ? "border-emerald-800 bg-emerald-800 text-white shadow-lg shadow-emerald-900/20" : "border-emerald-100 bg-emerald-50 hover:border-emerald-300"}`}
                >
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${selected ? "bg-white/15 text-amber-300" : "bg-white text-emerald-800"}`}>
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-bold ${selected ? "text-white" : "text-emerald-950"}`}>{title}</span>
                    <span className={`mt-0.5 block text-sm ${selected ? "text-emerald-100" : "text-slate-600"}`}>{description}</span>
                  </span>
                  <CircleCheck className={`h-6 w-6 shrink-0 ${selected ? "text-amber-400" : "text-emerald-200"}`} aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <button type="button" disabled={!role} onClick={() => changeMode("signup")} className={`${authPrimaryButtonClass} mt-6`}>
            Continue <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <p className="mt-5 text-center text-sm text-slate-600">Already have an account? <button type="button" onClick={() => changeMode("login")} className="font-bold text-emerald-800 hover:text-emerald-950">Sign in</button></p>
        </div>
      ) : null}

      {mode === "signup" ? (
        <details className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <summary className="cursor-pointer font-bold">About verification</summary>
          <p className="mt-2">Email and phone verification are coming soon. Face and ID checks are not available yet. Do not upload or send identity documents or photos.</p>
          <p className="mt-2">Carrier applications still require approval.</p>
        </details>
      ) : null}

      {mode === "login" ? (
        <div role="tablist" aria-label="Sign-in method" className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-emerald-50 p-1 text-sm font-semibold">
          {(["email", "phone"] as const).map((method) => (
            <button
              key={method}
              type="button"
              role="tab"
              aria-selected={loginMethod === method}
              onClick={() => { setLoginMethod(method); setMessage(""); }}
              className={`min-h-11 rounded-xl transition ${loginMethod === method ? "bg-emerald-800 text-white shadow-sm" : "text-emerald-900 hover:bg-emerald-100"}`}
            >
              {method === "email" ? "Email" : "Phone or username"}
            </button>
          ))}
        </div>
      ) : null}

      {(mode === "login" && loginMethod === "email") || mode === "signup" ? (
        <>
          <button type="button" disabled={loading} onClick={googleSignIn} className="mt-6 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 bg-white font-semibold text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60">
            <GoogleMark /> Continue with Google
          </button>
          <div className="my-5 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-200" />or continue with email<span className="h-px flex-1 bg-slate-200" /></div>
        </>
      ) : null}

      {mode === "login" && loginMethod === "phone" ? (
        <div className="mt-6 space-y-4">
          <div>
            <label className={labelClass} htmlFor="login-identifier">Phone number or username</label>
            <input id="login-identifier" className={authInputClass} disabled placeholder="0712 345 678 or your username" />
          </div>
          <div>
            <label className={labelClass} htmlFor="login-identifier-password">Password</label>
            <input id="login-identifier-password" className={authInputClass} type="password" disabled />
          </div>
          <ComingSoon>Phone and username sign-in. Use email for now.</ComingSoon>
          <button type="button" onClick={() => setLoginMethod("email")} className={authSecondaryButtonClass}>
            Sign in with email instead
          </button>
        </div>
      ) : null}

      {mode === "signup" || (mode === "login" && loginMethod === "email") ? <form className="space-y-4" onSubmit={submit} noValidate={mode === "signup"}>
        {mode === "signup" ? (
          <div>
            <label className={labelClass} htmlFor="full-name">Full name</label>
            <input id="full-name" className={authInputClass} autoComplete="name" placeholder="e.g. Jane Wanjiku" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          </div>
        ) : null}
        <div>
          <label className={labelClass} htmlFor="email">Email address</label>
          <input id="email" className={authInputClass} type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          {mode === "signup" ? <ComingSoon>Email verification</ComingSoon> : null}
        </div>
        {mode === "signup" ? (
          <>
            <div>
              <label className={labelClass} htmlFor="phone">Phone number</label>
              <input id="phone" className={authInputClass} type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" value={phone} onChange={(event) => setPhone(event.target.value)} required />
              <ComingSoon>Phone verification by SMS</ComingSoon>
            </div>
            <div>
              <label className={labelClass} htmlFor="username">Username <span className="font-normal text-slate-500">(optional)</span></label>
              <input id="username" className={authInputClass} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="e.g. jane_k" value={username} onChange={(event) => setUsername(event.target.value)} />
              <p className="mt-2 text-xs text-slate-500">3 to 30 letters, numbers, dots or underscores.</p>
            </div>
          </>
        ) : null}
        {passwordField}
        {mode === "login" ? (
          <div className="flex justify-end">
            <button type="button" disabled={loading} onClick={sendPasswordReset} className="min-h-11 text-sm font-semibold text-emerald-800 hover:text-emerald-950">Forgot password?</button>
          </div>
        ) : null}
        <button disabled={loading} className={`${authPrimaryButtonClass} !mt-6`}>
          {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
          {loading ? null : <ArrowRight className="h-5 w-5" aria-hidden="true" />}
        </button>
      </form> : null}

      {mode !== "choose" ? statusMessage : null}

      {mode === "signup" ? (
        <ul className="mt-5 flex justify-center gap-2" aria-label="Our promise">
          {["Quick", "Safe", "Reliable"].map((word) => (
            <li key={word} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{word}</li>
          ))}
        </ul>
      ) : null}

      {mode !== "choose" ? (
        <p className="mt-5 text-center text-sm text-slate-600">
          {mode === "login" ? "New to Beba? " : "Already have an account? "}
          <button type="button" disabled={loading} onClick={() => changeMode(mode === "login" ? "choose" : "login")} className="font-bold text-emerald-800 hover:text-emerald-950">{mode === "login" ? "Create account" : "Sign in"}</button>
        </p>
      ) : null}
    </AuthScene>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}
