"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { openNotification } from "@/lib/actions/notifications";
import { notificationMessage } from "@/lib/notifications";

export type SenderNotification = {
  id: string;
  event_type: string;
  delivery_status: string | null;
  read_at: string | null;
  delivery_requests: { tracking_number: string } | null;
};

export type ActiveDelivery = {
  id: string;
  tracking_number: string;
  current_status: string;
};

export function SenderNotifications({
  notifications,
  activeDeliveries,
  unreadCount,
  unavailable,
  deliveriesUnavailable,
}: {
  notifications: SenderNotification[];
  activeDeliveries: ActiveDelivery[];
  unreadCount: number;
  unavailable: boolean;
  deliveriesUnavailable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [router]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={unavailable ? "Notifications unavailable" : `Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {!unavailable && unreadCount > 0 ? <span aria-hidden="true" className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-white bg-orange-500" /> : null}
      </button>
      <div id={panelId} hidden={!open} className="absolute right-0 top-full z-30 mt-2 max-h-[min(70vh,32rem)] w-80 max-w-[calc(100vw-6.5rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <h2 className="text-base font-bold">Notifications</h2>
        {unavailable ? (
          <p role="status" className="mt-3 text-sm text-slate-700">Notifications are unavailable. Please try again later.</p>
        ) : notifications.length ? (
          <div className="mt-3 space-y-1">
            {notifications.map((notification) => (
              <form action={openNotification} key={notification.id}>
                <input type="hidden" name="notificationId" value={notification.id} />
                <button type="submit" className="flex min-h-11 w-full gap-2 rounded-lg px-2 py-3 text-left text-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-700">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" aria-hidden="true" style={{ visibility: notification.read_at ? "hidden" : "visible" }} />
                  <span>
                    <span className="block font-semibold">{notification.delivery_requests?.tracking_number ?? "Delivery"}</span>
                    <span className="block">{notificationMessage(notification.event_type, notification.delivery_status)}</span>
                    {!notification.read_at ? <span className="block text-xs font-semibold text-slate-700">Unread</span> : null}
                  </span>
                </button>
              </form>
            ))}
            {unreadCount > notifications.filter((item) => !item.read_at).length ? (
              <p className="px-2 text-xs text-slate-700">More unread updates will appear as you open these.</p>
            ) : null}
          </div>
        ) : <p className="mt-3 text-sm text-slate-600">No delivery updates yet.</p>}

        <h3 className="mt-4 border-t border-slate-200 pt-4 text-sm font-bold">Recent active deliveries</h3>
        {deliveriesUnavailable ? <p className="mt-2 text-sm text-slate-700">Active deliveries are unavailable. Please try again later.</p> : activeDeliveries.length ? (
          <ul className="mt-2 space-y-1">
            {activeDeliveries.map((delivery) => (
              <li key={delivery.id}>
                <Link href={`/deliveries/${delivery.id}`} onClick={() => setOpen(false)} className="block min-h-11 rounded-lg px-2 py-2 text-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-700">
                  <span className="block font-semibold">{delivery.tracking_number}</span>
                  <span className="block capitalize">{delivery.current_status.replaceAll("_", " ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-slate-600">No active deliveries.</p>}
      </div>
    </div>
  );
}
