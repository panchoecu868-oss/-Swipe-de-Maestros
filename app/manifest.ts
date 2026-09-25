import type { MetadataRoute } from "next";

// Convención de Next 16: node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Swipe de Maestros",
    short_name: "Maestros",
    description: "Entrenamiento de ajedrez en español, una carta a la vez.",
    lang: "es",
    start_url: "/feed",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#12110f",
    theme_color: "#2f6f4f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
