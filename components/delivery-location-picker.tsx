"use client";

import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
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

  useEffect(() => {
    if (latitude && longitude) setPosition([Number(latitude), Number(longitude)]);
  }, [latitude, longitude]);

  function selectLocation(nextLatitude: number, nextLongitude: number) {
    setLatitude(nextLatitude.toFixed(6));
    setLongitude(nextLongitude.toFixed(6));
    setPosition([nextLatitude, nextLongitude]);
    setStatus("Location pinned.");
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
        <label className="mb-2 block text-sm font-medium" htmlFor={`${name}Location`}>Location or street</label>
        <input
          id={`${name}Location`}
          name={`${name}Location`}
          type="text"
          defaultValue={locationName}
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
          <MapClickHandler onSelect={selectLocation} />
          {latitude && longitude ? <Marker position={position} icon={defaultIcon} /> : null}
        </MapContainer>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button type="button" onClick={useCurrentLocation} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">
          Use current location
        </button>
        <p className="text-right text-xs text-slate-600" role="status">
          {status || "Tap the map to pin this location."}
        </p>
      </div>
    </fieldset>
  );
}
