"use client";

import { useEffect } from "react";

/**
 * Registers the service worker on mount.
 * Rendered once inside the root layout body — has no visible UI.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // Check for SW updates every 60 seconds while the page is open
        setInterval(() => registration.update(), 60_000);
      })
      .catch((err) => {
        console.warn("[SW] Registration failed:", err);
      });
  }, []);

  return null;
}
