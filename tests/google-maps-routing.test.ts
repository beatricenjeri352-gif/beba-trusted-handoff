import assert from "node:assert/strict";
import test from "node:test";

import { getActualRouteDistanceMetres, getWalkingRouteForPreview } from "../lib/pricing/google-maps.ts";

test("Google Maps Routes API maps each transport method and returns metres", async () => {
  const previousApiKey = process.env.GOOGLE_MAPS_API_KEY;
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  process.env.GOOGLE_MAPS_API_KEY = "test-google-maps-key";
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    return new Response(JSON.stringify({ routes: [{ distanceMeters: 1234 }] }), { status: 200 });
  };

  try {
    const cases = [
      ["walking", "WALK"],
      ["bicycle", "BICYCLE"],
      ["motorbike", "TWO_WHEELER"],
      ["car", "DRIVE"],
    ] as const;

    for (const [transport, travelMode] of cases) {
      const result = await getActualRouteDistanceMetres(
        transport,
        { latitude: -1.2, longitude: 36.8 },
        { latitude: -1.3, longitude: 36.9 },
      );

      assert.equal(result.metres, 1234);
      assert.equal(result.provider, "google_maps_routes");
      assert.equal(result.providerReference, null);
      assert.equal(requests.at(-1)?.url, "https://routes.googleapis.com/directions/v2:computeRoutes");

      const headers = new Headers(requests.at(-1)?.init?.headers);
      assert.equal(headers.get("X-Goog-Api-Key"), "test-google-maps-key");
      assert.equal(headers.get("X-Goog-FieldMask"), "routes.distanceMeters");

      const body = JSON.parse(String(requests.at(-1)?.init?.body)) as {
        travelMode: string;
      };
      assert.equal(body.travelMode, travelMode);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (previousApiKey === undefined) {
      delete process.env.GOOGLE_MAPS_API_KEY;
    } else {
      process.env.GOOGLE_MAPS_API_KEY = previousApiKey;
    }
  }
});

test("walking preview requests distance and route geometry together", async () => {
  const previousApiKey = process.env.GOOGLE_MAPS_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.GOOGLE_MAPS_API_KEY = "test-google-maps-key";
  globalThis.fetch = async (_input, init) => {
    assert.equal(new Headers(init?.headers).get("X-Goog-FieldMask"), "routes.distanceMeters,routes.polyline.encodedPolyline");
    assert.equal(JSON.parse(String(init?.body)).travelMode, "WALK");
    return new Response(JSON.stringify({ routes: [{ distanceMeters: 500, polyline: { encodedPolyline: "abc" } }] }), { status: 200 });
  };
  try {
    assert.deepEqual(await getWalkingRouteForPreview(
      { latitude: -1.2, longitude: 36.8 },
      { latitude: -1.3, longitude: 36.9 },
    ), { metres: 500, polyline: "abc" });
  } finally {
    globalThis.fetch = originalFetch;
    if (previousApiKey === undefined) delete process.env.GOOGLE_MAPS_API_KEY;
    else process.env.GOOGLE_MAPS_API_KEY = previousApiKey;
  }
});

test("missing Google Maps key returns a routing configuration error", async () => {
  const previousApiKey = process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.GOOGLE_MAPS_API_KEY;

  try {
    await assert.rejects(
      getActualRouteDistanceMetres(
        "walking",
        { latitude: -1.2, longitude: 36.8 },
        { latitude: -1.3, longitude: 36.9 },
      ),
      /ROUTING_PROVIDER_NOT_CONFIGURED/,
    );
  } finally {
    if (previousApiKey !== undefined) process.env.GOOGLE_MAPS_API_KEY = previousApiKey;
  }
});

test("Google Maps errors and missing route distances fail without a fallback", async () => {
  const previousApiKey = process.env.GOOGLE_MAPS_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.GOOGLE_MAPS_API_KEY = "test-google-maps-key";

  try {
    globalThis.fetch = async () => new Response("provider error", { status: 403 });
    await assert.rejects(
      getActualRouteDistanceMetres(
        "walking",
        { latitude: -1.2, longitude: 36.8 },
        { latitude: -1.3, longitude: 36.9 },
      ),
      /ROUTE_DISTANCE_NOT_AVAILABLE/,
    );

    globalThis.fetch = async () => new Response(JSON.stringify({ routes: [] }), { status: 200 });
    await assert.rejects(
      getActualRouteDistanceMetres(
        "walking",
        { latitude: -1.2, longitude: 36.8 },
        { latitude: -1.3, longitude: 36.9 },
      ),
      /ROUTE_DISTANCE_NOT_AVAILABLE/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previousApiKey === undefined) {
      delete process.env.GOOGLE_MAPS_API_KEY;
    } else {
      process.env.GOOGLE_MAPS_API_KEY = previousApiKey;
    }
  }
});
