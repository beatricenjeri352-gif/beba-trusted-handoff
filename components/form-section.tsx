"use client";

import { useState } from "react";

export function FormSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="rounded-2xl border border-slate-200 p-4 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-bold">
        <span>{title}</span>
        <span className="text-slate-400" aria-hidden="true">▾</span>
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}
