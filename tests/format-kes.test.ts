import assert from "node:assert/strict";
import test from "node:test";

import { formatKes } from "../lib/pricing/format.ts";

test("formats cents as shillings with thousands separators", () => {
  assert.equal(formatKes(6000), "KES 60");
  assert.equal(formatKes(150000), "KES 1,500");
  assert.equal(formatKes(12345), "KES 123.45");
  assert.equal(formatKes(0), "KES 0");
});
