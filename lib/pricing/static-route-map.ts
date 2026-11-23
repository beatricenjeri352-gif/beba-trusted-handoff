import { createHmac } from "node:crypto";

type Point = { latitude: number; longitude: number };

export function getStaticRouteMap(pickup: Point, destination: Point, polyline: string): string {
  const key = process.env.GOOGLE_MAPS_STATIC_BROWSER_KEY?.trim();
  const secret = process.env.GOOGLE_MAPS_STATIC_SIGNING_SECRET?.trim();
  if (!key || !secret) throw new Error("MAP_PROVIDER_NOT_CONFIGURED");
  if (!polyline || polyline.length > 12000) throw new Error("MAP_ROUTE_NOT_AVAILABLE");

  const params = new URLSearchParams({
    size: "600x300",
    scale: "2",
    markers: `color:green|label:P|${pickup.latitude},${pickup.longitude}`,
    path: `color:0x047857ff|weight:5|enc:${polyline}`,
    key,
  });
  params.append("markers", `color:red|label:D|${destination.latitude},${destination.longitude}`);
  const path = `/maps/api/staticmap?${params}`;
  const signature = createHmac("sha1", Buffer.from(secret.replace(/-/g, "+").replace(/_/g, "/"), "base64"))
    .update(path).digest("base64").replace(/\+/g, "-").replace(/\//g, "_");
  const url = `https://maps.googleapis.com${path}&signature=${encodeURIComponent(signature)}`;
  if (url.length > 16384) throw new Error("MAP_ROUTE_NOT_AVAILABLE");
  return url;
}
