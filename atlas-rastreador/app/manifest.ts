import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Atlas Rastreador",
    short_name: "Rastreador",
    description: "Monitoramento, auditoria e geolocalização aproximada de IP — Atlas Performance Group.",
    start_url: "/",
    display: "standalone",
    background_color: "#210000",
    theme_color: "#b40b0b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
