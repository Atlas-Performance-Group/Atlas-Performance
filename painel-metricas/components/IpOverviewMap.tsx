"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type GeoPoint = {
  ip: string;
  lat: number;
  lon: number;
  city: string | null;
  country: string | null;
};

export function IpOverviewMap({ points }: { points: GeoPoint[] }) {
  const center: [number, number] = points.length
    ? [points[0].lat, points[0].lon]
    : [-14.235, -51.9253]; // centro aproximado do Brasil, usado só quando não há pontos ainda

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--line-soft)" }}>
      <MapContainer center={center} zoom={points.length ? 3 : 3} style={{ height: 380, width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p, i) => (
          <CircleMarker
            key={`${p.ip}-${i}`}
            center={[p.lat, p.lon]}
            radius={6}
            pathOptions={{ color: "#c00000", fillColor: "#fdaa04", fillOpacity: 0.75, weight: 2 }}
          >
            <Popup>
              <strong>{p.ip}</strong>
              <br />
              {[p.city, p.country].filter(Boolean).join(" — ") || "Localização aproximada"}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
