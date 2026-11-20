import assert from "node:assert/strict";
import test from "node:test";

import {
  CARRIER_LOCATION_MAX_AGE_MS,
  describeCarrierDistance,
  describePickupDistance,
  describeRatings,
  formatDistance,
  isLocationFresh,
  validateReview,
} from "../lib/carrier/location.ts";

test("formats short distances in metres and longer ones in kilometres", () => {
  assert.equal(formatDistance(300), "300 m");
  assert.equal(formatDistance(1800), "1.8 km");
  assert.throws(() => formatDistance(-1), /INVALID_DISTANCE/);
});

test("treats a location as fresh only up to the maximum age", () => {
  const now = Date.parse("2026-11-19T12:00:00Z");
  const updatedAt = new Date(now - CARRIER_LOCATION_MAX_AGE_MS).toISOString();
  assert.equal(isLocationFresh(updatedAt, now), true);
  assert.equal(isLocationFresh(new Date(now - CARRIER_LOCATION_MAX_AGE_MS - 1).toISOString(), now), false);
});

test("validates review rating and comment", () => {
  assert.deepEqual(validateReview({ rating: "4", comment: "  Good  " }), { ok: true, rating: 4, comment: "Good" });
  assert.deepEqual(validateReview({ rating: 5, comment: "   " }), { ok: true, rating: 5, comment: null });
  assert.deepEqual(validateReview({ rating: 0, comment: "" }), { ok: false, error: "RATING_INVALID" });
  assert.deepEqual(validateReview({ rating: 3.5, comment: "" }), { ok: false, error: "RATING_INVALID" });
  assert.deepEqual(validateReview({ rating: 5, comment: "x".repeat(501) }), { ok: false, error: "COMMENT_TOO_LONG" });
});

test("describes carrier distance and ratings for the sender", () => {
  const distances = new Map<string, number | null>([
    ["near", 300],
    ["unknown", null],
  ]);
  assert.equal(describeCarrierDistance(distances, "near"), "300 m away by road");
  assert.equal(describeCarrierDistance(distances, "unknown"), "Distance unavailable right now");
  assert.equal(describeCarrierDistance(distances, "offline"), "Not online right now");
  assert.equal(describeRatings([4, 5]), "4.5 average from 2 reviews");
  assert.equal(describeRatings([]), "No reviews yet");
});

test("does not show a pickup distance to an offline carrier", () => {
  assert.equal(
    describePickupDistance({ online: false, pickupPinned: true, metres: 300 }),
    "Go online to see how far the pickup is from you.",
  );
  assert.equal(
    describePickupDistance({ online: true, pickupPinned: true, metres: 300 }),
    "300 m from pickup by road",
  );
});
