import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./app/i18n/request.ts");

const nextConfig: NextConfig = {
  headers: async () => [
    {
      // Service worker must be served at root scope with correct headers
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
        { key: "Content-Type", value: "application/javascript" },
      ],
    },
    {
      source: "/manifest.json",
      headers: [
        { key: "Content-Type", value: "application/manifest+json" },
        { key: "Cache-Control", value: "public, max-age=86400" },
      ],
    },
    {
      // SVG icons — served with correct MIME type
      source: "/icons/:icon*.svg",
      headers: [
        { key: "Content-Type", value: "image/svg+xml" },
        { key: "Cache-Control", value: "public, max-age=604800, immutable" },
      ],
    },
    {
      // Splash screens
      source: "/splash/:splash*.svg",
      headers: [
        { key: "Content-Type", value: "image/svg+xml" },
        { key: "Cache-Control", value: "public, max-age=604800, immutable" },
      ],
    },
  ],
};

export default withNextIntl(nextConfig);
