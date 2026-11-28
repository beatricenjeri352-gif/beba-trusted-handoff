"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Back button used across the app. Goes to the previous in-app page when there is one,
 * otherwise to `fallbackHref` (e.g. when the page was opened from a link or a new tab).
 */
export function BackButton({
  fallbackHref = "/",
  label,
  onBack,
  variant = "plain",
  disabled = false,
}: {
  fallbackHref?: string;
  label?: string;
  /** Overrides the default history behaviour, e.g. for steps inside one page. */
  onBack?: () => void;
  /** "overlay" is a round white button for use on top of photos. */
  variant?: "plain" | "overlay";
  disabled?: boolean;
}) {
  const router = useRouter();

  function goBack() {
    if (onBack) return onBack();
    const cameFromApp = typeof document !== "undefined" && document.referrer.startsWith(window.location.origin);
    if (cameFromApp && window.history.length > 1) router.back();
    else router.push(fallbackHref);
  }

  const styles = variant === "overlay"
    ? "h-11 w-11 justify-center rounded-full bg-white/90 text-emerald-900 shadow-lg shadow-emerald-950/20 backdrop-blur-sm hover:bg-white"
    : `min-h-11 gap-2 rounded-full ${label ? "pr-3" : "w-11 justify-center"} text-emerald-800 hover:bg-emerald-50`;

  return (
    <button
      type="button"
      onClick={goBack}
      disabled={disabled}
      aria-label={label ? undefined : "Go back"}
      className={`inline-flex shrink-0 items-center font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50 ${styles}`}
    >
      <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      {label && variant === "plain" ? <span>{label}</span> : null}
    </button>
  );
}
