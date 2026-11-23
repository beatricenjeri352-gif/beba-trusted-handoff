import Link from "next/link";

import { isCarrierProfileLocked } from "@/lib/profiles/carrier-lock";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Profile = "sender" | "carrier";

const PROFILE_LINKS: Record<Profile, { href: string; label: string }> = {
  sender: { href: "/deliveries", label: "Sender" },
  carrier: { href: "/jobs", label: "Carrier" },
};

export async function ProfileSwitcher({ current }: { current: Profile }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const locked = await isCarrierProfileLocked(user.id);

  if (locked) {
    return (
      <div className="flex flex-col gap-2 px-2 text-sm">
        <span className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-4 py-2 font-semibold text-white">
          {PROFILE_LINKS[current].label}
        </span>
        <span className="text-slate-600">Carrier profile restricted. Profile switching is unavailable.</span>
      </div>
    );
  }

  return (
    <nav aria-label="Switch profile" className="flex w-full rounded-full border border-slate-300 p-1 text-sm font-semibold">
      {(Object.keys(PROFILE_LINKS) as Profile[]).map((profile) => {
        const link = PROFILE_LINKS[profile];
        const active = profile === current;

        return (
          <Link
            key={profile}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-full px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
