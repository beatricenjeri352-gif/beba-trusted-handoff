import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { getStaticRouteMap } from "../lib/pricing/static-route-map.ts";

test("static map URL uses the walking route and is signed without exposing the secret", () => {
  const oldKey = process.env.GOOGLE_MAPS_STATIC_BROWSER_KEY;
  const oldSecret = process.env.GOOGLE_MAPS_STATIC_SIGNING_SECRET;
  const secret = Buffer.from("test-secret").toString("base64url");
  process.env.GOOGLE_MAPS_STATIC_BROWSER_KEY = "test-browser-key";
  process.env.GOOGLE_MAPS_STATIC_SIGNING_SECRET = secret;
  try {
    const result = getStaticRouteMap({ latitude: -1, longitude: 36 }, { latitude: -2, longitude: 37 }, "encoded-route");
    const url = new URL(result);
    assert.equal(url.origin, "https://maps.googleapis.com");
    assert.equal(url.searchParams.get("key"), "test-browser-key");
    assert.equal(url.searchParams.get("path"), "color:0x047857ff|weight:5|enc:encoded-route");
    assert.equal(url.searchParams.getAll("markers").length, 2);
    const unsigned = result.slice(result.indexOf("/maps/api/"), result.lastIndexOf("&signature="));
    const signature = createHmac("sha1", Buffer.from(secret, "base64url")).update(unsigned).digest("base64url");
    assert.equal(url.searchParams.get("signature")?.replace(/=+$/, ""), signature);
    assert.ok(!result.includes(secret));
  } finally {
    if (oldKey === undefined) delete process.env.GOOGLE_MAPS_STATIC_BROWSER_KEY;
    else process.env.GOOGLE_MAPS_STATIC_BROWSER_KEY = oldKey;
    if (oldSecret === undefined) delete process.env.GOOGLE_MAPS_STATIC_SIGNING_SECRET;
    else process.env.GOOGLE_MAPS_STATIC_SIGNING_SECRET = oldSecret;
  }
});

test("static map requires separate credentials and valid route geometry", () => {
  const oldKey = process.env.GOOGLE_MAPS_STATIC_BROWSER_KEY;
  const oldSecret = process.env.GOOGLE_MAPS_STATIC_SIGNING_SECRET;
  try {
    delete process.env.GOOGLE_MAPS_STATIC_BROWSER_KEY;
    delete process.env.GOOGLE_MAPS_STATIC_SIGNING_SECRET;
    assert.throws(() => getStaticRouteMap({ latitude: -1, longitude: 36 }, { latitude: -2, longitude: 37 }, "route"), /MAP_PROVIDER_NOT_CONFIGURED/);
    process.env.GOOGLE_MAPS_STATIC_BROWSER_KEY = "test-key";
    process.env.GOOGLE_MAPS_STATIC_SIGNING_SECRET = Buffer.from("test-secret").toString("base64url");
    assert.throws(() => getStaticRouteMap({ latitude: -1, longitude: 36 }, { latitude: -2, longitude: 37 }, ""), /MAP_ROUTE_NOT_AVAILABLE/);
  } finally {
    if (oldKey === undefined) delete process.env.GOOGLE_MAPS_STATIC_BROWSER_KEY;
    else process.env.GOOGLE_MAPS_STATIC_BROWSER_KEY = oldKey;
    if (oldSecret === undefined) delete process.env.GOOGLE_MAPS_STATIC_SIGNING_SECRET;
    else process.env.GOOGLE_MAPS_STATIC_SIGNING_SECRET = oldSecret;
  }
});
