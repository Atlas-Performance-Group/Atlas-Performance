"use client";

import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LocationAccuracy } from "@/lib/geo/types";

// Ícone padrão do Leaflet depende de assets resolvidos via bundler CSS —
// em builds Next.js isso quebra o caminho default, então apontamos direto
// para o CDN oficial do próprio pacote (mesma versão instalada).
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const RADIUS_BY_ACCURACY: Record<LocationAccuracy, number> = {
  HIGH: 5000,
  MEDIUM: 20000,
  LOW: 60000,
  UNKNOWN: 100000,
};

export function IpMap({
  lat,
  lon,
  city,
  region,
  country,
  accuracy,
}: {
  lat: number;
  lon: number;
  city: string | null;
  region: string | null;
  country: string | null;
  accuracy: LocationAccuracy;
}) {
  const label = [city, region, country].filter(Boolean).join(" — ") || "Localização aproximada";
  const radius = RADIUS_BY_ACCURACY[accuracy];

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--line-soft)" }}>
      <MapContainer
        center={[lat, lon]}
        zoom={accuracy === "HIGH" ? 11 : accuracy === "MEDIUM" ? 9 : 7}
        style={{ height: 360, width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={[lat, lon]}
          radius={radius}
          pathOptions={{ color: "#c00000", fillColor: "#fdaa04", fillOpacity: 0.18 }}
        />
        <Marker position={[lat, lon]} icon={markerIcon}>
          <Popup>
            <strong>{label}</strong>
            <br />
            Localização aproximada — não representa um endereço exato.
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
