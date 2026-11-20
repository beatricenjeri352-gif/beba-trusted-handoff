// Walking delivery fee bands. Distances are whole metres from the Google Maps walking route.
// Bands are inclusive at their upper bound, so 500 m is the first band and 501 m is the second.
export const WALKING_MAX_DISTANCE_METRES = 3000;

export const WALKING_FEE_BANDS = [
  { maxDistanceMetres: 500, feeCents: 6000 },
  { maxDistanceMetres: 1200, feeCents: 10000 },
  { maxDistanceMetres: 2000, feeCents: 15000 },
  { maxDistanceMetres: 3000, feeCents: 20000 },
] as const;

export const TOO_FAR_TO_WALK_RECOMMENDED_TRANSPORT = ["car", "tuktuk", "boda"] as const;

export interface WalkingDeliveryQuote {
  status: "priced";
  walkingDistanceMetres: number;
  deliveryFeeCents: number;
  commissionCents: number;
  carrierEarningsCents: number;
}

export interface TooFarToWalkResult {
  status: "too_far_to_walk";
  walkingDistanceMetres: number;
  message: string;
  recommendedTransport: readonly string[];
}

export type WalkingDeliveryResult = WalkingDeliveryQuote | TooFarToWalkResult;

export function calculateWalkingCommissionCents(deliveryFeeCents: number): number {
  if (!Number.isSafeInteger(deliveryFeeCents) || deliveryFeeCents < 0 || deliveryFeeCents % 100 !== 0) {
    throw new Error("Delivery fee must be a whole number of shillings in cents");
  }

  // 10% rounded to the nearest whole shilling, with half a shilling rounding up.
  const feeShillings = deliveryFeeCents / 100;
  const commissionShillings = Math.floor((feeShillings * 10 + 50) / 100);
  return commissionShillings * 100;
}

// Routes over the walking limit return a "too far" result with other transport options instead of a fee.
export function calculateWalkingDeliveryQuote(walkingDistanceMetres: number): WalkingDeliveryResult {
  if (!Number.isSafeInteger(walkingDistanceMetres) || walkingDistanceMetres < 0) {
    throw new Error("Walking distance must be a non-negative whole number of metres");
  }

  const band = WALKING_FEE_BANDS.find((candidate) => walkingDistanceMetres <= candidate.maxDistanceMetres);
  if (!band) {
    return {
      status: "too_far_to_walk",
      walkingDistanceMetres,
      message: "Too far to walk. Choose a car, tuktuk, or boda instead.",
      recommendedTransport: TOO_FAR_TO_WALK_RECOMMENDED_TRANSPORT,
    };
  }

  const commissionCents = calculateWalkingCommissionCents(band.feeCents);
  return {
    status: "priced",
    walkingDistanceMetres,
    deliveryFeeCents: band.feeCents,
    commissionCents,
    carrierEarningsCents: band.feeCents - commissionCents,
  };
}
