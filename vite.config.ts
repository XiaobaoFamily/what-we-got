import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "./" : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.svg"],
      manifest: {
        name: "家里有啥",
        short_name: "家里有啥",
        description: "一家人的常温、冷藏与冷冻库存清单",
        theme_color: "#12372a",
        background_color: "#f6f4ee",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "./",
        scope: "./",
        icons: [
          { src: "pwa-192x192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
          { src: "pwa-512x512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" }
        ]
      },
      workbox: {
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\//i,
            handler: "NetworkOnly"
          }
        ]
      }
    })
  ]
}));
