import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Métricas Atlas",
    short_name: "Métricas Atlas",
    description: "Painel de métricas de performance da Atlas Performance Group.",
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
