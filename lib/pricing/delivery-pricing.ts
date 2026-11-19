export type TransportMethod = "walking" | "bicycle" | "motorbike" | "car";

export interface PricingConfiguration {
  baseFeeCents: number;
  walkingRateCentsPerKm: number;
  bicycleRateCentsPerKm: number;
  motorbikeRateCentsPerKm: number;
  carRateCentsPerKm: number;
}

export interface DeliveryPriceCalculation {
  actualRouteDistanceMetres: number;
  minimumBillableDistanceMetres: number;
  billableDistanceMetres: number;
  transportMethod: TransportMethod;
  baseFeeCents: number;
  distanceRateCentsPerKm: number;
  distanceChargeCents: number;
  deliveryPriceCents: number;
}

const APPROVED_CONFIG: PricingConfiguration = {
  baseFeeCents: 5000,
  walkingRateCentsPerKm: 1000,
  bicycleRateCentsPerKm: 2000,
  motorbikeRateCentsPerKm: 2000,
  carRateCentsPerKm: 2000,
};

const MINIMUM_BILLABLE_DISTANCE_METRES = 5000;

function positiveInteger(value: number, fieldName: string): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > 2147483647) {
    throw new Error(`${fieldName} must be a non-negative database integer`);
  }
  return value;
}

export function normalizeTransportMethod(value: string | null | undefined): TransportMethod | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "motorcycle" || normalized === "motorbike") return "motorbike";
  if (normalized === "walking" || normalized === "bicycle" || normalized === "car") return normalized;
  return null;
}

export function getDistanceRateCentsPerKm(
  transportMethod: TransportMethod,
  configuration: PricingConfiguration = APPROVED_CONFIG,
): number {
  switch (transportMethod) {
    case "walking":
      return configuration.walkingRateCentsPerKm;
    case "bicycle":
      return configuration.bicycleRateCentsPerKm;
    case "motorbike":
      return configuration.motorbikeRateCentsPerKm;
    case "car":
      return configuration.carRateCentsPerKm;
  }
}

export function calculateDeliveryPrice(
  transportMethod: TransportMethod,
  actualRouteDistanceMetres: number,
  configuration: PricingConfiguration = APPROVED_CONFIG,
): DeliveryPriceCalculation {
  const actualMetres = positiveInteger(actualRouteDistanceMetres, "actual route distance in metres");
  const minimumMetres = MINIMUM_BILLABLE_DISTANCE_METRES;
  const billableMetres = Math.max(actualMetres, minimumMetres);
  const rateCentsPerKm = positiveInteger(
    getDistanceRateCentsPerKm(transportMethod, configuration),
    "distance rate",
  );

  const baseFeeCents = positiveInteger(configuration.baseFeeCents, "base fee");
  const distanceChargeNumerator = billableMetres * rateCentsPerKm + 500;
  if (!Number.isSafeInteger(distanceChargeNumerator)) {
    throw new Error("Distance charge exceeds the supported calculation range");
  }
  const distanceChargeCents = Math.floor(distanceChargeNumerator / 1000);
  const deliveryPriceCents = baseFeeCents + distanceChargeCents;
  positiveInteger(deliveryPriceCents, "delivery price");

  return {
    actualRouteDistanceMetres: actualMetres,
    minimumBillableDistanceMetres: minimumMetres,
    billableDistanceMetres: billableMetres,
    transportMethod,
    baseFeeCents,
    distanceRateCentsPerKm: rateCentsPerKm,
    distanceChargeCents,
    deliveryPriceCents,
  };
}

export function calculateCommissionCents(finalAgreedPriceCents: number): number {
  positiveInteger(finalAgreedPriceCents, "final agreed price");

  return Math.floor((finalAgreedPriceCents * 1000 + 5000) / 10000);
}
