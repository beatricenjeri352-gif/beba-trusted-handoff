"use client";

import { Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { DeliveryWizard } from "@/components/delivery-wizard";
import styles from "@/components/sender-home.module.css";

export function SenderHome({ fullName }: { fullName: string | null }) {
  const [showWizard, setShowWizard] = useState(false);
  const [started, setStarted] = useState(false);
  const wizardHeadingRef = useRef<HTMLHeadingElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const firstName = fullName?.trim().split(/\s+/)[0];

  useEffect(() => {
    if (!started) return;
    if (showWizard) wizardHeadingRef.current?.focus();
    else createButtonRef.current?.focus();
  }, [showWizard, started]);

  return (
    <>
      <section hidden={showWizard} aria-labelledby="sender-welcome">
        <h1 id="sender-welcome" className="mt-6 text-2xl font-bold sm:text-3xl">
          {firstName ? `Welcome, ${firstName}` : "Welcome to Beba"}
        </h1>

        <div
          aria-hidden="true"
          className="mt-6 flex min-h-[38dvh] items-center justify-center overflow-hidden rounded-3xl bg-emerald-100 sm:min-h-72"
        >
          <div className={styles.truck}>
            <Truck className="h-36 w-36 text-emerald-700 sm:h-44 sm:w-44" strokeWidth={1.3} />
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-bold sm:text-2xl">Need to send something?</h2>
          <p className="mt-2 text-slate-600">Tell us what you&apos;re sending and where it needs to go.</p>
          <button
            ref={createButtonRef}
            type="button"
            onClick={() => {
              setStarted(true);
              setShowWizard(true);
            }}
            className="mt-6 min-h-12 w-full rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Create a delivery
          </button>
        </div>
      </section>

      {started ? (
        <section hidden={!showWizard} aria-labelledby="create-delivery-heading" className="mt-6">
          <h1 id="create-delivery-heading" ref={wizardHeadingRef} tabIndex={-1} className="mb-6 text-2xl font-bold sm:text-3xl">
            Create a delivery
          </h1>
          <DeliveryWizard onBackHome={() => setShowWizard(false)} />
        </section>
      ) : null}
    </>
  );
}
