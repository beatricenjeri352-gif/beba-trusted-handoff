import assert from "node:assert/strict";
import test from "node:test";

import { validateDeliveryStep, type DeliveryFormState } from "../lib/delivery/validation.ts";

const valid: DeliveryFormState = {
  deliveryMethod: "within_town",
  parcelDescription: "Books",
  parcelSize: "",
  weightKg: "",
  pickupLocation: "Pickup",
  pickupLandmark: "",
  pickupLatitude: "-1.2",
  pickupLongitude: "36.8",
  destinationLocation: "Drop-off",
  destinationLandmark: "",
  destinationLatitude: "-1.3",
  destinationLongitude: "36.9",
  receiverName: "",
  receiverPhone: "",
};

test("each completed section accepts valid details without optional landmarks or receiver data", () => {
  for (const step of [1, 2, 3] as const) {
    assert.equal(validateDeliveryStep(step, valid), null);
  }
});

test("parcel completion requires a description and valid optional weight", () => {
  assert.match(validateDeliveryStep(1, { ...valid, parcelDescription: "  " })!, /description/);
  assert.match(validateDeliveryStep(1, { ...valid, weightKg: "-1" })!, /weight/);
});

test("edited or invalid locations cannot remain completed", () => {
  assert.match(validateDeliveryStep(2, { ...valid, pickupLocation: "Edited", pickupLatitude: "", pickupLongitude: "" })!, /pickup/);
  assert.match(validateDeliveryStep(3, { ...valid, destinationLatitude: "91" })!, /drop-off/);
});

test("an invalid optional receiver phone prevents completion", () => {
  assert.match(validateDeliveryStep(3, { ...valid, receiverPhone: "invalid" })!, /phone/);
});
