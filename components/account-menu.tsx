"use client";

import { LogOut, Settings, UserRound } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import { signOut } from "@/lib/actions/account";

export function AccountMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [error, signOutAction, pending] = useActionState(signOut, null);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(!open)}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        <UserRound className="h-5 w-5" aria-hidden="true" />
      </button>

      <div
        id={menuId}
        hidden={!open}
        className="absolute right-0 top-full z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"
      >
        <div className="flex min-h-11 items-center gap-3 px-2 text-sm text-slate-700">
          <UserRound className="h-5 w-5" aria-hidden="true" />
          <span>Profile</span>
          <span className="ml-auto text-xs text-slate-600">Coming soon</span>
        </div>
        <div className="flex min-h-11 items-center gap-3 px-2 text-sm text-slate-700">
          <Settings className="h-5 w-5" aria-hidden="true" />
          <span>Settings</span>
          <span className="ml-auto text-xs text-slate-600">Coming soon</span>
        </div>

        <div className="my-2 border-t border-slate-200" />
        {children}
        <div className="my-2 border-t border-slate-200" />

        <form action={signOutAction}>
          <button
            type="submit"
            disabled={pending}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            {pending ? "Signing out..." : "Sign out"}
          </button>
          {error ? <p role="alert" className="px-2 pt-2 text-sm text-red-700">{error}</p> : null}
        </form>
      </div>
    </div>
  );
}
