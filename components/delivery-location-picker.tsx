"use client";

import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface LocationPickerProps {
  name: string;
  label: string;
  locationName: string;
  landmark: string;
}

interface SearchResult {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
}

function MapPositionHandler({ position }: { position: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, 15, { animate: true });
  }, [map, position]);

  return null;
}

function MapClickHandler({
  onSelect,
}: {
  onSelect: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export default function DeliveryLocationPicker({
  name,
  label,
  locationName,
  landmark,
}: LocationPickerProps) {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [status, setStatus] = useState("");
  const [position, setPosition] = useState<[number, number]>([-1.286389, 36.817223]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(locationName);

  function selectLocation(nextLatitude: number, nextLongitude: number) {
    setLatitude(nextLatitude.toFixed(6));
    setLongitude(nextLongitude.toFixed(6));
    setPosition([nextLatitude, nextLongitude]);
    setStatus("Location pinned.");
  }

  async function searchLocations() {
    const query = searchQuery.trim();
    if (query.length < 3) {
      setStatus("Enter at least 3 characters to search.");
      setSearchResults([]);
      return;
    }

    setSearching(true);
    setStatus("Searching locations...");

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ke&q=${encodeURIComponent(query)}`,
        { headers: { Accept: "application/json" } },
      );

      if (!response.ok) throw new Error("Location search failed");

      const results = (await response.json()) as SearchResult[];
      setSearchResults(results);
      setStatus(results.length ? `${results.length} locations found.` : "No matching locations found.");
    } catch {
      setSearchResults([]);
      setStatus("Location search is unavailable. You can still pin the map or use GPS.");
    } finally {
      setSearching(false);
    }
  }

  function chooseSearchResult(result: SearchResult) {
    const nextLatitude = Number(result.lat);
    const nextLongitude = Number(result.lon);

    if (!Number.isFinite(nextLatitude) || !Number.isFinite(nextLongitude)) return;

    setSelectedAddress(result.display_name);
    setSearchResults([]);
    selectLocation(nextLatitude, nextLongitude);
    setStatus("Location selected from search.");
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setStatus("Location is not supported by this browser.");
      return;
    }

    setStatus("Getting current location...");
    navigator.geolocation.getCurrentPosition(
      (result) => {
        selectLocation(result.coords.latitude, result.coords.longitude);
      },
      () => setStatus("Location permission was denied or unavailable."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }

  return (
    <fieldset className="rounded-2xl border border-slate-200 p-4">
      <legend className="px-1 text-sm font-bold">{label}</legend>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor={`${name}Search`}>Search location</label>
        <div className="flex gap-2">
          <input
            id={`${name}Search`}
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void searchLocations();
              }
            }}
            placeholder="Search building, road, stage, or town"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3"
          />
          <button type="button" onClick={() => void searchLocations()} disabled={searching} aria-label={searching ? "Searching" : "Search location"} title="Search location" className="flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 disabled:opacity-60">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
        <button type="button" onClick={useCurrentLocation} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-left text-sm font-semibold">
          Use my current location
        </button>

        {searchResults.length ? (
          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
            {searchResults.map((result) => (
              <button
                key={String(result.place_id)}
                type="button"
                onClick={() => chooseSearchResult(result)}
                className="block w-full border-b border-slate-100 px-3 py-3 text-left text-sm last:border-b-0 hover:bg-slate-50"
              >
                {result.display_name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-sm font-medium" htmlFor={`${name}Location`}>Location or street</label>
        <input
          id={`${name}Location`}
          name={`${name}Location`}
          type="text"
          value={selectedAddress}
          onChange={(event) => setSelectedAddress(event.target.value)}
          placeholder="Street, gate, building, or nearby place"
          className="w-full rounded-xl border border-slate-300 px-4 py-3"
          required
        />
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-sm font-medium" htmlFor={`${name}Landmark`}>Nearest commonly known building or landmark</label>
        <input
          id={`${name}Landmark`}
          name={`${name}Landmark`}
          type="text"
          defaultValue={landmark}
          placeholder="Example: Naivas, City Hall, main stage"
          className="w-full rounded-xl border border-slate-300 px-4 py-3"
        />
      </div>

      <input type="hidden" name={`${name}Latitude`} value={latitude} />
      <input type="hidden" name={`${name}Longitude`} value={longitude} />

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-300" style={{ height: 260 }}>
        <MapContainer center={position} zoom={13} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapPositionHandler position={position} />
          <MapClickHandler onSelect={selectLocation} />
          {latitude && longitude ? <Marker position={position} icon={defaultIcon} /> : null}
        </MapContainer>
      </div>

      <div className="mt-3 flex items-center justify-end gap-3">
        <p className="text-right text-xs text-slate-600" role="status">
          {status || "Tap the map to pin this location."}
        </p>
      </div>
    </fieldset>
  );
}
