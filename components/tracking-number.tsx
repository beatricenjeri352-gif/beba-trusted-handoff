"use client";

import { useState } from "react";

export function TrackingNumber({ tracking }: { tracking: string }) {
  const [message, setMessage] = useState("");

  async function copyTracking() {
    try {
      await navigator.clipboard.writeText(tracking);
      setMessage("Tracking ID copied.");
    } catch {
      setMessage("Could not copy. Please select the tracking ID and copy it manually.");
    }
  }

  return (
    <div>
      <p className="break-all font-semibold text-emerald-700">{tracking}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={copyTracking} className="min-h-11 rounded-lg border border-emerald-700 px-3 text-sm font-semibold text-emerald-700">Copy tracking ID</button>
        <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(`Beba tracking ID: ${tracking}\n`)}`} download="beba-tracking-id.txt" className="inline-flex min-h-11 items-center rounded-lg border border-emerald-700 px-3 text-sm font-semibold text-emerald-700">Download tracking ID</a>
      </div>
      <p role="status" className="mt-1 text-sm text-slate-600">{message}</p>
    </div>
  );
}
