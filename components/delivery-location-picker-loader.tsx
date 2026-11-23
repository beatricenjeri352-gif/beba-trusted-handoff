"use client";

import DeliveryLocationPicker from "@/components/delivery-location-picker";

interface LocationPickerLoaderProps {
  name: string;
  label: string;
  locationName: string;
  landmark: string;
  onLocationChange?: (location: string, latitude: string, longitude: string, landmark: string) => void;
}

export default function DeliveryLocationPickerLoader(props: LocationPickerLoaderProps) {
  return <DeliveryLocationPicker {...props} />;
}
