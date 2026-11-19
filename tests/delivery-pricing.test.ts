import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCommissionCents,
  calculateDeliveryPrice,
  normalizeTransportMethod,
  type TransportMethod,
} from "../lib/pricing/delivery-pricing.ts";

const cases: Array<{ transport: TransportMethod; metres: number; cents: number }> = [
  { transport: "walking", metres: 2000, cents: 10000 },
  { transport: "walking", metres: 8000, cents: 13000 },
  { transport: "bicycle", metres: 3000, cents: 15000 },
  { transport: "bicycle", metres: 8000, cents: 21000 },
  { transport: "motorbike", metres: 5000, cents: 15000 },
  { transport: "motorbike", metres: 10000, cents: 25000 },
  { transport: "car", metres: 3000, cents: 15000 },
  { transport: "car", metres: 10000, cents: 25000 },
];

for (const testCase of cases) {
  test(`${testCase.transport} ${testCase.metres / 1000} km uses the approved price`, () => {
    const quote = calculateDeliveryPrice(testCase.transport, testCase.metres);
    assert.equal(quote.deliveryPriceCents, testCase.cents);
  });
}

test("weight, traffic and parcel size add no automatic surcharge", () => {
  const quote = calculateDeliveryPrice("walking", 5000);
  assert.equal(quote.deliveryPriceCents, 10000);
  assert.equal(quote.distanceChargeCents, 5000);
});

test("minimum billable distance is 5 km", () => {
  const quote = calculateDeliveryPrice("walking", 2000);
  assert.equal(quote.actualRouteDistanceMetres, 2000);
  assert.equal(quote.minimumBillableDistanceMetres, 5000);
  assert.equal(quote.billableDistanceMetres, 5000);
});

for (const [priceCents, commissionCents] of [
  [5000, 500],
  [10000, 1000],
  [15000, 1500],
  [25000, 2500],
  [50000, 5000],
  [100000, 10000],
]) {
  test(`KES ${priceCents / 100} produces KES ${commissionCents / 100} commission`, () => {
    assert.equal(calculateCommissionCents(priceCents), commissionCents);
  });
}

test("small prices have no minimum commission", () => {
  assert.equal(calculateCommissionCents(50), 5);
});

test("prices outside the database integer range are rejected", () => {
  assert.throws(() => calculateDeliveryPrice("car", 2147483647), /database integer/);
});

test("private negotiated extras are excluded", () => {
  const originalCents = calculateDeliveryPrice("walking", 5000).deliveryPriceCents;
  assert.equal(calculateCommissionCents(originalCents), 1000);
});

test("in-app negotiated extras are included in final commission", () => {
  const originalCents = calculateDeliveryPrice("walking", 5000).deliveryPriceCents;
  const privateExtraCents = 3000;
  assert.equal(calculateCommissionCents(originalCents), 1000);

  const recordedFinalCents = originalCents + privateExtraCents;
  assert.equal(calculateCommissionCents(recordedFinalCents), 1300);
});

test("legacy motorcycle profile maps to motorbike transport", () => {
  assert.equal(normalizeTransportMethod("motorcycle"), "motorbike");
  assert.equal(normalizeTransportMethod("motorbike"), "motorbike");
});
