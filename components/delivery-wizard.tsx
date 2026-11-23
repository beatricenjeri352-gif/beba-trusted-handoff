"use client";

import { CheckCircle2, ChevronDown, Package, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import DeliveryLocationPickerLoader from "@/components/delivery-location-picker-loader";
import { createDeliveryAction } from "@/lib/actions/delivery";
import { validateDeliveryStep, type DeliveryFormState, type DeliveryStep } from "@/lib/delivery/validation";

const emptyForm: DeliveryFormState = {
  deliveryMethod: "within_town",
  parcelDescription: "",
  parcelSize: "",
  weightKg: "",
  pickupLocation: "",
  pickupLandmark: "",
  pickupLatitude: "",
  pickupLongitude: "",
  destinationLocation: "",
  destinationLandmark: "",
  destinationLatitude: "",
  destinationLongitude: "",
  receiverName: "",
  receiverPhone: "",
};

const steps: { number: DeliveryStep; title: string }[] = [
  { number: 1, title: "Parcel details" },
  { number: 2, title: "Pickup location" },
  { number: 3, title: "Drop-off and receiver" },
];

export function DeliveryWizard() {
  const [currentStep, setCurrentStep] = useState<DeliveryStep>(1);
  const [highestStep, setHighestStep] = useState<DeliveryStep>(1);
  const [formData, setFormData] = useState<DeliveryFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; tracking: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const stepButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const shouldFocusStep = useRef(false);

  useEffect(() => {
    if (shouldFocusStep.current) {
      stepButtons.current[currentStep]?.focus();
      shouldFocusStep.current = false;
    }
  }, [currentStep]);

  function updateForm(values: Partial<DeliveryFormState>) {
    setFormData((previous) => ({ ...previous, ...values }));
    setError(null);
  }

  function openStep(step: DeliveryStep) {
    if (step !== currentStep) {
      shouldFocusStep.current = true;
      setCurrentStep(step);
    }
    setError(null);
  }

  function continueTo(step: 2 | 3) {
    const message = validateDeliveryStep(currentStep, formData);
    if (message) {
      setError(message);
      return;
    }
    if (step > highestStep) setHighestStep(step);
    openStep(step);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    for (const step of [1, 2, 3] as const) {
      const message = validateDeliveryStep(step, formData);
      if (message) {
        openStep(step);
        setError(message);
        return;
      }
    }

    startTransition(async () => {
      try {
        const result = await createDeliveryAction(formData);
        if (result.error) {
          const messages: Record<string, string> = {
            "delivery-required": "Please complete the required delivery details.",
            "location-pin-required": "Please select both locations from the suggestions.",
            "invalid-weight": "Enter a valid weight of zero or more.",
            "invalid-receiver-phone": "Enter a valid receiver phone number or leave it blank.",
            "delivery-save-failed": "Your request could not be saved. Please try again.",
          };
          setError(messages[result.error] ?? "Your request could not be created. Please try again.");
          return;
        }
        if (result.success && result.id && result.tracking) {
          setCreated({ id: result.id, tracking: result.tracking });
          return;
        }
        console.error("Delivery creation returned an incomplete response");
        setError("The delivery response was incomplete. Check your recent deliveries before trying again.");
      } catch (error) {
        console.error("Error creating delivery:", error);
        setError("Your request could not be created. Please check your recent deliveries before trying again.");
      }
    });
  }

  if (created) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-700" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-bold">Your delivery request is ready!</h2>
        <p className="mt-2 text-slate-600">No carrier has been selected yet.</p>
        <p className="mt-4 text-sm font-semibold text-emerald-700">Tracking: {created.tracking}</p>
        <Link
          href={`/deliveries/${created.id}#carrier`}
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Find a carrier
        </Link>
        <button
          type="button"
          onClick={() => {
            setCreated(null);
            setFormData(emptyForm);
            setHighestStep(1);
            setCurrentStep(1);
            setError(null);
          }}
          className="mt-3 min-h-12 w-full rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Create another delivery
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      {steps.map(({ number, title }) => {
        const isOpen = currentStep === number;
        const completed = number < highestStep && !validateDeliveryStep(number, formData);
        const available = number <= highestStep;
        const Icon = number === 1 ? Package : Truck;

        return (
          <section key={number} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <h2>
              <button
                ref={(element) => { stepButtons.current[number] = element; }}
                type="button"
                disabled={!available || isPending}
                aria-expanded={isOpen}
                aria-controls={`delivery-step-${number}`}
                onClick={() => openStep(number)}
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {completed ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                ) : (
                  <Icon className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                )}
                <span className="flex-1 font-semibold">
                  {title}
                  {completed ? <span className="sr-only">, completed</span> : null}
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
            </h2>

            <div id={`delivery-step-${number}`} hidden={!isOpen} className="space-y-5 border-t border-slate-100 p-4 sm:p-6">
              {number === 1 ? (
                <>
                  <div>
                    <label htmlFor="deliveryMethod" className="mb-2 block text-sm font-medium">Delivery method</label>
                    <select id="deliveryMethod" value={formData.deliveryMethod} onChange={(event) => updateForm({ deliveryMethod: event.target.value })} className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3">
                      <option value="within_town">Within town</option>
                      <option value="to_stage">To a stage</option>
                      <option value="intertown">Inter-town</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="parcelDescription" className="mb-2 block text-sm font-medium">Parcel description <span aria-hidden="true">*</span></label>
                    <textarea id="parcelDescription" value={formData.parcelDescription} onChange={(event) => updateForm({ parcelDescription: event.target.value })} rows={3} className="w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="What are you sending?" required />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="parcelSize" className="mb-2 block text-sm font-medium">Parcel size (optional)</label>
                      <select id="parcelSize" value={formData.parcelSize} onChange={(event) => updateForm({ parcelSize: event.target.value })} className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3">
                        <option value="">Select size</option>
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="weightKg" className="mb-2 block text-sm font-medium">Weight in kg (optional)</label>
                      <input id="weightKg" type="number" min="0" step="0.1" value={formData.weightKg} onChange={(event) => updateForm({ weightKg: event.target.value })} className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3" />
                    </div>
                  </div>
                </>
              ) : null}

              {number === 2 ? (
                <DeliveryLocationPickerLoader
                  name="pickup"
                  label="Pickup location"
                  locationName={formData.pickupLocation}
                  landmark={formData.pickupLandmark}
                  onLocationChange={(location, latitude, longitude, landmark) => updateForm({
                    pickupLocation: location, pickupLatitude: latitude, pickupLongitude: longitude, pickupLandmark: landmark,
                  })}
                />
              ) : null}

              {number === 3 ? (
                <>
                  <DeliveryLocationPickerLoader
                    name="destination"
                    label="Drop-off location"
                    locationName={formData.destinationLocation}
                    landmark={formData.destinationLandmark}
                    onLocationChange={(location, latitude, longitude, landmark) => updateForm({
                      destinationLocation: location, destinationLatitude: latitude, destinationLongitude: longitude, destinationLandmark: landmark,
                    })}
                  />
                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <h3 className="font-semibold">Receiver details</h3>
                    <div>
                      <label htmlFor="receiverName" className="mb-2 block text-sm font-medium">Receiver name (optional)</label>
                      <input id="receiverName" type="text" value={formData.receiverName} onChange={(event) => updateForm({ receiverName: event.target.value })} className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3" />
                    </div>
                    <div>
                      <label htmlFor="receiverPhone" className="mb-2 block text-sm font-medium">Receiver phone (optional)</label>
                      <input id="receiverPhone" type="tel" inputMode="tel" placeholder="0712 345 678" value={formData.receiverPhone} onChange={(event) => updateForm({ receiverPhone: event.target.value })} className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3" />
                    </div>
                  </div>
                </>
              ) : null}

              {isOpen && error ? <p role="alert" className="text-sm font-medium text-red-700">{error}</p> : null}
              {number < 3 ? (
                <button type="button" onClick={() => continueTo(number === 1 ? 2 : 3)} disabled={isPending} className="min-h-12 w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50">
                  Continue
                </button>
              ) : (
                <button type="submit" disabled={isPending} className="min-h-12 w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50">
                  {isPending ? "Creating..." : "Create delivery request"}
                </button>
              )}
            </div>
          </section>
        );
      })}
    </form>
  );
}
