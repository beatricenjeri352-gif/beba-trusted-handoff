"use client";

import DeliveryLocationPicker from "@/components/delivery-location-picker";

interface LocationPickerLoaderProps {
  name: string;
  label: string;
  locationName: string;
  landmark: string;
}

export default function DeliveryLocationPickerLoader(props: LocationPickerLoaderProps) {
  return <DeliveryLocationPicker {...props} />;
}
