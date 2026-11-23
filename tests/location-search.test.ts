import assert from "node:assert/strict";
import test from "node:test";

import { describePlaceKind, toPlaceSuggestion } from "../lib/location/search.ts";

test("labels roads, stages, areas, and places from Nominatim types", () => {
  assert.equal(describePlaceKind({ class: "highway", type: "residential" }), "Road");
  assert.equal(describePlaceKind({ type: "bus_stop" }), "Stage");
  assert.equal(describePlaceKind({ addresstype: "suburb" }), "Area");
  assert.equal(describePlaceKind({ class: "amenity", type: "restaurant" }), "Place");
  assert.equal(describePlaceKind({ type: "other" }), "Location");
});

test("drops suggestions without coordinates or a name", () => {
  assert.equal(toPlaceSuggestion({ display_name: "Nairobi", lat: "x", lon: "36" }), null);
  assert.deepEqual(
    toPlaceSuggestion({
      place_id: 1,
      display_name: "Tom Mboya Street, Nairobi",
      lat: "-1.28",
      lon: "36.82",
      class: "highway",
      type: "primary",
    }),
    {
      id: "1",
      label: "Tom Mboya Street, Nairobi",
      kind: "Road",
      latitude: -1.28,
      longitude: 36.82,
    },
  );
});
