export type TransportMethod = "walking" | "bicycle" | "motorbike" | "car";

export interface PricingConfiguration {
  baseFeeCents: number;
  walkingRateCentsPerKm: number;
  bicycleRateCentsPerKm: number;
  motorbikeRateCentsPerKm: number;
  carRateCentsPerKm: number;
  minimumBillableDistanceMetres: number;
  commissionPercent: number;
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
  minimumBillableDistanceMetres: 5000,
  commissionPercent: 10,
};

function positiveInteger(value: number, fieldName: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative safe integer`);
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
  const minimumMetres = positiveInteger(configuration.minimumBillableDistanceMetres, "minimum billable distance");
  const billableMetres = Math.max(actualMetres, minimumMetres);
  const rateCentsPerKm = getDistanceRateCentsPerKm(transportMethod, configuration);

  const baseFeeCents = positiveInteger(configuration.baseFeeCents, "base fee");
  const distanceChargeCents = Math.floor((billableMetres * rateCentsPerKm + 500) / 1000);

  return {
    actualRouteDistanceMetres: actualMetres,
    minimumBillableDistanceMetres: minimumMetres,
    billableDistanceMetres: billableMetres,
    transportMethod,
    baseFeeCents,
    distanceRateCentsPerKm: rateCentsPerKm,
    distanceChargeCents,
    deliveryPriceCents: baseFeeCents + distanceChargeCents,
  };
}

export function calculateCommissionCents(finalAgreedPriceCents: number, commissionPercent = 10): number {
  positiveInteger(finalAgreedPriceCents, "final agreed price");

  if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
    throw new Error("Commission percentage must be between 0 and 100");
  }

  const commissionPercentHundredths = Math.round(commissionPercent * 100);
  return Math.floor((finalAgreedPriceCents * commissionPercentHundredths + 5000) / 10000);
}
