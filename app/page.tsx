import Image from "next/image";
import Link from "next/link";

const PROMISES = ["Quick", "Safe", "Reliable"];

export default function HomePage() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-emerald-950">
      {/* Hero photo fills the screen; the courier sits left/centre with open sky at the top */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <Image
          src="/hero-mobile.webp"
          alt=""
          fill
          preload
          sizes="100vw"
          className="hero-drift object-cover object-[35%_15%]"
        />
        {/* Deepen the bottom so white text and buttons stay readable over the road */}
        <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-emerald-950 via-emerald-950/85 to-transparent" />
      </div>

      <header className="mx-auto flex w-full max-w-md justify-end px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="fade-up rounded-2xl bg-white/90 px-3 py-2 shadow-lg shadow-emerald-950/20 backdrop-blur-sm">
          <Image src="/beba-logo.png" alt="Beba" width={640} height={278} preload className="h-9 w-auto" />
        </div>
      </header>

      <div className="flex-1" />

      <section className="mx-auto w-full max-w-md px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <h1 className="fade-up text-4xl font-bold leading-tight tracking-tight text-white [animation-delay:120ms] sm:text-5xl">
          Welcome to{" "}
          <span className="relative inline-block">
            Beba
            <span aria-hidden="true" className="absolute -bottom-1 left-0 h-1.5 w-full -rotate-1 rounded-full bg-amber-400" />
          </span>
        </h1>

        <p className="fade-up mt-4 text-lg leading-7 text-emerald-50 [animation-delay:220ms]">
          Send anything, anywhere in town.
        </p>

        <ul className="fade-up mt-4 flex flex-wrap gap-2 [animation-delay:300ms]" aria-label="Our promise">
          {PROMISES.map((word) => (
            <li key={word} className="rounded-full border border-emerald-300/40 bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-100">
              {word}
            </li>
          ))}
        </ul>

        <div className="fade-up mt-8 space-y-3 [animation-delay:400ms]">
          <Link
            href="/login?mode=signup"
            className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 font-semibold text-emerald-950 shadow-lg shadow-amber-500/25 transition hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            Get started <span aria-hidden="true">→</span>
          </Link>
          <Link
            href="/login"
            className="flex min-h-14 items-center justify-center rounded-2xl border border-white/70 px-5 font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            I already have an account
          </Link>
        </div>
      </section>
    </main>
  );
}
