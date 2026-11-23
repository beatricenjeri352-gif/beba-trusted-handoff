import type { TransportMethod } from "../pricing/delivery-pricing";

export const CARRIER_LOCATION_MAX_AGE_MS = 30 * 60 * 1000;
export const REVIEW_COMMENT_MAX_LENGTH = 500;

const DRIVING_VEHICLE_TYPES = new Set([
  "motorcycle",
  "motorbike",
  "tuktuk",
  "car",
  "pickup",
  "van",
  "truck",
  "matatu",
  "public_transport",
]);

const DRIVING_CARRIER_TYPES = new Set(["motorcycle", "car", "van", "matatu"]);

export function routeTransportMethodForCarrier(profile: {
  vehicle_type?: string | null;
  carrier_type?: string | null;
}): TransportMethod {
  const vehicle = profile.vehicle_type?.trim().toLowerCase() ?? "";
  if (vehicle === "walking") return "walking";
  if (vehicle === "bicycle") return "bicycle";
  if (DRIVING_VEHICLE_TYPES.has(vehicle)) return "car";

  const carrierType = profile.carrier_type?.trim().toLowerCase() ?? "";
  if (DRIVING_CARRIER_TYPES.has(carrierType)) return "car";

  return "walking";
}

export function formatDistance(metres: number): string {
  if (!Number.isSafeInteger(metres) || metres < 0) throw new Error("INVALID_DISTANCE");
  if (metres < 1000) return `${metres} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

export function isLocationFresh(updatedAt: string, nowMs: number): boolean {
  const updatedMs = Date.parse(updatedAt);
  return Number.isFinite(updatedMs) && nowMs - updatedMs <= CARRIER_LOCATION_MAX_AGE_MS;
}

export function isValidCoordinate(latitude: unknown, longitude: unknown): latitude is number {
  return typeof latitude === "number"
    && typeof longitude === "number"
    && Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

export type ReviewInput =
  | { ok: true; rating: number; comment: string | null }
  | { ok: false; error: "RATING_INVALID" | "COMMENT_TOO_LONG" };

export function validateReview(input: { rating: unknown; comment: unknown }): ReviewInput {
  const rating = typeof input.rating === "string" ? Number(input.rating) : input.rating;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "RATING_INVALID" };
  }

  const text = typeof input.comment === "string" ? input.comment.trim() : "";
  if (text.length > REVIEW_COMMENT_MAX_LENGTH) return { ok: false, error: "COMMENT_TOO_LONG" };

  return { ok: true, rating, comment: text.length ? text : null };
}

export function summarizeRatings(ratings: number[]): { count: number; average: number | null } {
  if (!ratings.length) return { count: 0, average: null };
  const total = ratings.reduce((sum, rating) => sum + rating, 0);
  return { count: ratings.length, average: Math.round((total / ratings.length) * 10) / 10 };
}

export function describePickupDistance(input: {
  online: boolean;
  pickupPinned: boolean;
  metres: number | null | undefined;
}): string {
  if (!input.online) return "Go online to see how far the pickup is from you.";
  if (!input.pickupPinned) return "Pickup location is not pinned.";
  if (input.metres == null) return "Distance unavailable right now.";
  return `${formatDistance(input.metres)} from pickup by road`;
}

export function describeCarrierDistance(distances: Map<string, number | null>, carrierId: string): string {
  if (!distances.has(carrierId)) return "Not online right now";
  const metres = distances.get(carrierId);
  if (metres == null) return "Distance unavailable right now";
  return `${formatDistance(metres)} away by road`;
}

export function describeRatings(ratings: number[] | undefined): string {
  const { count, average } = summarizeRatings(ratings ?? []);
  if (!count || average == null) return "No reviews yet";
  return `${average.toFixed(1)} average from ${count} ${count === 1 ? "review" : "reviews"}`;
}
