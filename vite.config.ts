import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "pwa-icon.svg", "logos/Logo60jours_noir.png", "logos/Logo60jours_blanc.png"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        importScripts: ["/custom-sw.js"],
      },
      manifest: {
        name: "60 jours de formation",
        short_name: "60jours",
        description: "Formations intensives créatives en 60 jours",
        theme_color: "#0E1B2E",
        background_color: "#0E1B2E",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/logos/Logo60jours_noir.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/logos/Logo60jours_noir.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
