import assert from "node:assert/strict";
import test from "node:test";

import { calculateWalkingDeliveryQuote } from "../lib/pricing/walking-bands.ts";

const cases: Array<{ metres: number; fee: number; commission: number; carrier: number }> = [
  { metres: 400, fee: 6000, commission: 600, carrier: 5400 },
  { metres: 500, fee: 6000, commission: 600, carrier: 5400 },
  { metres: 600, fee: 10000, commission: 1000, carrier: 9000 },
  { metres: 1200, fee: 10000, commission: 1000, carrier: 9000 },
  { metres: 1300, fee: 15000, commission: 1500, carrier: 13500 },
  { metres: 2000, fee: 15000, commission: 1500, carrier: 13500 },
  { metres: 2100, fee: 20000, commission: 2000, carrier: 18000 },
  { metres: 3000, fee: 20000, commission: 2000, carrier: 18000 },
];

for (const testCase of cases) {
  test(`walking ${testCase.metres} m is priced in its band`, () => {
    const quote = calculateWalkingDeliveryQuote(testCase.metres);
    assert.ok(quote);
    assert.equal(quote.status, "priced");
    assert.equal(quote.deliveryFeeCents, testCase.fee);
    assert.equal(quote.commissionCents, testCase.commission);
    assert.equal(quote.carrierEarningsCents, testCase.carrier);
  });
}

test("walking routes over 3 km return too far to walk with other transport options", () => {
  for (const metres of [3001, 3100]) {
    const result = calculateWalkingDeliveryQuote(metres);
    assert.equal(result.status, "too_far_to_walk");
    assert.deepEqual(result.recommendedTransport, ["car", "tuktuk", "boda"]);
    assert.match(result.message, /Too far to walk/);
  }
});

test("walking distance must be a whole number of metres", () => {
  assert.throws(() => calculateWalkingDeliveryQuote(500.5));
  assert.throws(() => calculateWalkingDeliveryQuote(-1));
});
