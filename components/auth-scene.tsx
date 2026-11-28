import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BackButton } from "@/components/back-button";

export type AuthIllustration = "handoff" | "wave";

const ILLUSTRATIONS: Record<AuthIllustration, { src: string; position: string }> = {
  // Courier and shop owner passing a parcel; keep both faces in frame.
  handoff: { src: "/auth-handoff.webp", position: "object-[50%_30%]" },
  // Courier waving; her face sits just right of centre.
  wave: { src: "/auth-wave.webp", position: "object-[55%_25%]" },
};

/** Shared layout for the auth screens: illustration on top, white sheet sliding up over it. */
export function AuthScene({
  illustration,
  onBack,
  backDisabled,
  children,
}: {
  illustration: AuthIllustration;
  onBack: () => void;
  backDisabled?: boolean;
  children: ReactNode;
}) {
  const art = ILLUSTRATIONS[illustration];

  return (
    <main className="min-h-dvh bg-emerald-950 sm:py-8">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden bg-white sm:min-h-0 sm:rounded-[2rem] sm:shadow-2xl">
        <div className="relative h-[34dvh] min-h-56 max-h-80 w-full shrink-0 overflow-hidden bg-emerald-800">
          <Image
            key={art.src}
            src={art.src}
            alt=""
            fill
            preload
            sizes="(min-width: 448px) 448px, 100vw"
            className={`hero-drift object-cover ${art.position}`}
          />
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-950/40 to-transparent" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <BackButton variant="overlay" onBack={onBack} disabled={backDisabled} />
            <Link href="/" aria-label="Beba home" className="rounded-2xl bg-white/90 px-3 py-1.5 shadow-lg shadow-emerald-950/20 backdrop-blur-sm">
              <Image src="/beba-logo.png" alt="Beba" width={640} height={278} preload className="h-8 w-auto" />
            </Link>
          </div>
        </div>

        <section className="fade-up relative -mt-8 flex-1 rounded-t-[2rem] bg-white px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-7 sm:px-8">
          {children}
        </section>
      </div>
    </main>
  );
}

export const authPrimaryButtonClass =
  "flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 font-semibold text-emerald-950 shadow-lg shadow-amber-500/25 transition hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

export const authSecondaryButtonClass =
  "flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-800 px-5 font-semibold text-emerald-900 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:opacity-60";
