"use client";

import dynamic from "next/dynamic";

const DeliveryLocationPicker = dynamic(
  () => import("@/components/delivery-location-picker"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
        Loading location map...
      </div>
    ),
  },
);

interface LocationPickerLoaderProps {
  name: string;
  label: string;
  locationName: string;
  landmark: string;
}

export default function DeliveryLocationPickerLoader(props: LocationPickerLoaderProps) {
  return <DeliveryLocationPicker {...props} />;
}
