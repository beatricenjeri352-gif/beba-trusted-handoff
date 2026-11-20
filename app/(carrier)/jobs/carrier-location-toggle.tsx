"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { clearCarrierLocation, publishCarrierLocation } from "./location-actions";

const PUBLISH_INTERVAL_MS = 2 * 60 * 1000;

export function CarrierLocationToggle({ initialOnline }: { initialOnline: boolean }) {
  const router = useRouter();
  const [online, setOnline] = useState(initialOnline);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const publishLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setMessage("This device cannot share its location.");
      return false;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 60_000,
        }),
      );
      const result = await publishCarrierLocation(position.coords.latitude, position.coords.longitude);
      if (!result.ok) {
        setMessage("Your location could not be saved. Try again.");
        return false;
      }
      setMessage(null);
      return true;
    } catch {
      setMessage("Allow location access in your browser to go online.");
      return false;
    }
  }, []);

  useEffect(() => {
    if (!online) return;
    const id = setInterval(() => {
      void publishLocation();
    }, PUBLISH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [online, publishLocation]);

  function toggleOnline() {
    startTransition(async () => {
      if (online) {
        const result = await clearCarrierLocation();
        if (result.ok) {
          setOnline(false);
          setMessage(null);
        } else {
          setMessage("Your location could not be cleared. Try again.");
        }
      } else if (await publishLocation()) {
        setOnline(true);
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <p className="font-bold">Availability</p>
      <p className="mt-1 text-sm text-slate-600">
        {online
          ? "You are online. Your location is shared with senders as a distance only, never as coordinates."
          : "You are offline. Senders will not see your distance."}
      </p>
      <button
        type="button"
        onClick={toggleOnline}
        disabled={pending}
        className="mt-3 min-h-11 w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
      >
        {online ? "Go offline" : "Go online"}
      </button>
      {message ? <p className="mt-2 text-sm text-amber-700">{message}</p> : null}
    </section>
  );
}
