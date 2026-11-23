"use client";

import { useEffect, useRef, useState } from "react";

import type { PlaceSuggestion } from "@/lib/location/search";

interface LocationPickerProps {
  name: string;
  label: string;
  locationName: string;
  landmark: string;
  onLocationChange?: (location: string, latitude: string, longitude: string, landmark: string) => void;
}

export default function DeliveryLocationPicker({
  name,
  label,
  locationName,
  landmark,
  onLocationChange,
}: LocationPickerProps) {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState(locationName);
  const [localLandmark, setLocalLandmark] = useState(landmark);
  const [landmarkOpen, setLandmarkOpen] = useState(Boolean(landmark));
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const selectedQuery = useRef<string | null>(null);

  function applyPlace(place: PlaceSuggestion, message: string) {
    selectedQuery.current = place.label;
    setQuery(place.label);
    setLatitude(place.latitude.toFixed(6));
    setLongitude(place.longitude.toFixed(6));
    setSuggestions([]);
    setStatus(message);
    // Call the callback to update parent form
    onLocationChange?.(place.label, place.latitude.toFixed(6), place.longitude.toFixed(6), landmark);
  }

  useEffect(() => {
    if (selectedQuery.current === query) {
      selectedQuery.current = null;
      return;
    }
    selectedQuery.current = null;

    const text = query.trim();
    if (text.length < 3) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setStatus("Looking up matching places...");
      try {
        const response = await fetch(`/api/location-search?q=${encodeURIComponent(text)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("search failed");
        const payload = await response.json() as { suggestions?: PlaceSuggestion[] };
        const next = payload.suggestions ?? [];
        setSuggestions(next);
        setStatus(next.length ? `${next.length} matching ${next.length === 1 ? "place" : "places"}` : "No matching places found.");
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return;
        setSuggestions([]);
        setStatus("Place search is unavailable. You can still use your current location.");
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function onQueryChange(value: string) {
    setQuery(value);
    setLatitude("");
    setLongitude("");
    setSuggestions([]);
    onLocationChange?.(value, "", "", localLandmark);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setStatus("Location is not supported by this browser.");
      return;
    }

    setStatus("Getting current location...");
    navigator.geolocation.getCurrentPosition(
      async (result) => {
        const lat = result.coords.latitude;
        const lng = result.coords.longitude;
        try {
          const response = await fetch(`/api/location-search?lat=${lat}&lng=${lng}`);
          const payload = await response.json() as { suggestions?: PlaceSuggestion[] };
          const place = payload.suggestions?.[0];
          if (place) {
            applyPlace(place, "Current location selected.");
            return;
          }
        } catch {
          // Keep coordinates even if the address lookup fails.
        }
        applyPlace({
          id: "gps",
          label: "Current location",
          kind: "Location",
          latitude: lat,
          longitude: lng,
        }, "Current location selected.");
      },
      () => setStatus("Location permission was denied or unavailable."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }

  const visibleSuggestions = query.trim().length < 3 ? [] : suggestions;

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>

      <label className="mb-2 block text-sm font-medium" htmlFor={`${name}Location`}>Search place, road, stage, or town</label>
      <input
        id={`${name}Location`}
        name={`${name}Location`}
        type="search"
        autoComplete="off"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Start typing a place name"
        className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3"
        required
      />

      {visibleSuggestions.length ? (
        <ul className="mt-2 overflow-hidden rounded-xl border border-slate-200">
          {visibleSuggestions.map((place) => (
            <li key={place.id} className="border-b border-slate-100 last:border-b-0">
              <button
                type="button"
                onClick={() => applyPlace(place, `${place.kind} selected.`)}
                className="block w-full break-words px-3 py-3 text-left hover:bg-slate-50"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{place.kind}</span>
                <span className="mt-1 block text-sm">{place.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button type="button" onClick={useCurrentLocation} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 text-left text-sm font-semibold">
        Use my current location
      </button>

      <details className="mt-3" open={landmarkOpen} onToggle={(event) => setLandmarkOpen(event.currentTarget.open)}>
        <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">Add landmark (optional)</summary>
        <label className="mb-2 block text-sm font-medium" htmlFor={`${name}Landmark`}>Nearby landmark</label>
        <input
          id={`${name}Landmark`}
          name={`${name}Landmark`}
          type="text"
          value={localLandmark}
          onChange={(e) => {
            setLocalLandmark(e.target.value);
            onLocationChange?.(query, latitude, longitude, e.target.value);
          }}
          placeholder="Example: Naivas, City Hall, main stage"
          className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3"
        />
      </details>

      <input type="hidden" name={`${name}Latitude`} value={latitude} />
      <input type="hidden" name={`${name}Longitude`} value={longitude} />

      <p className="mt-2 text-xs text-slate-600" role="status">
        {searching ? "Looking up matching places..." : status || "Type at least 3 letters, then choose a suggestion."}
      </p>
    </fieldset>
  );
}
