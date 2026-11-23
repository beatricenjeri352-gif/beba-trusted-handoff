import assert from "node:assert/strict";
import test from "node:test";

import { notificationMessage } from "../lib/notifications.ts";

test("delivery updates explain actions and use readable status text", () => {
  assert.equal(notificationMessage("created", "draft"), "Delivery request created. Choose a carrier.");
  assert.equal(notificationMessage("carrier_declined", null), "The carrier declined this delivery. Review the request.");
  assert.equal(notificationMessage("charge_proposed", null), "A carrier proposed an additional charge. Review the request.");
  assert.equal(notificationMessage("status_changed", "in_transit"), "Delivery status: in transit.");
});
