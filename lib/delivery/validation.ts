export interface DeliveryFormState {
  deliveryMethod: string;
  parcelDescription: string;
  parcelSize: string;
  weightKg: string;
  pickupLocation: string;
  pickupLandmark: string;
  pickupLatitude: string;
  pickupLongitude: string;
  destinationLocation: string;
  destinationLandmark: string;
  destinationLatitude: string;
  destinationLongitude: string;
  receiverName: string;
  receiverPhone: string;
}

export type DeliveryStep = 1 | 2 | 3;

export function normalizePhone(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 9) return `254${digits}`;
  return null;
}

export function isValidCoordinate(point: unknown): point is { latitude: number; longitude: number } {
  if (typeof point !== "object" || point === null) return false;
  const { latitude, longitude } = point as Record<string, unknown>;
  return typeof latitude === "number" && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && typeof longitude === "number" && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

function hasSelectedLocation(name: string, latitude: string, longitude: string) {
  if (!name.trim() || !latitude.trim() || !longitude.trim()) return false;
  return isValidCoordinate({ latitude: Number(latitude), longitude: Number(longitude) });
}

export function validateDeliveryStep(step: DeliveryStep, data: DeliveryFormState): string | null {
  if (step === 1) {
    if (!data.parcelDescription.trim()) return "Enter a parcel description.";
    const weight = data.weightKg.trim();
    if (weight && (!Number.isFinite(Number(weight)) || Number(weight) < 0)) {
      return "Enter a valid weight of zero or more.";
    }
  }
  if (step === 2 && !hasSelectedLocation(data.pickupLocation, data.pickupLatitude, data.pickupLongitude)) {
    return "Select a pickup location from the suggestions or use your current location.";
  }
  if (step === 3) {
    if (!hasSelectedLocation(data.destinationLocation, data.destinationLatitude, data.destinationLongitude)) {
      return "Select a drop-off location from the suggestions or use your current location.";
    }
    if (data.receiverPhone && !normalizePhone(data.receiverPhone)) {
      return "Enter a valid receiver phone number or leave it blank.";
    }
  }
  return null;
}
