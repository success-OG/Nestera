"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * "Add to Home Screen" banner shown when the browser fires beforeinstallprompt.
 * Respects a 30-day dismissal stored in localStorage.
 * On iOS Safari (which does not fire beforeinstallprompt) a manual instructions
 * tooltip is shown instead.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    // Never show if already installed (display-mode: standalone)
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Check 30-day dismissal cooldown
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const cooldown = 30 * 24 * 60 * 60 * 1000; // 30 days
      if (Date.now() - Number(dismissed) < cooldown) return;
    }

    // iOS Safari — show manual install hint
    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !("MSStream" in window);
    if (isIos) {
      setShowIosHint(true);
      return;
    }

    // Chrome / Edge / Android — listen for browser prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
    setShowBanner(false);
    setShowIosHint(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "dismissed") {
      localStorage.setItem("pwa-install-dismissed", String(Date.now()));
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  }

  if (!showBanner && !showIosHint) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Nestera app"
      style={{
        position: "fixed",
        bottom: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 32px)",
        maxWidth: "480px",
        background: "#0a2f2f",
        border: "1px solid #00d4c0",
        borderRadius: "12px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        zIndex: 9999,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        color: "#fff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: "16px", margin: 0 }}>
            📲 Add Nestera to your home screen
          </p>
          <p style={{ fontSize: "13px", opacity: 0.8, margin: "4px 0 0" }}>
            {showIosHint
              ? "Tap the Share button (⬆) then choose "Add to Home Screen"."
              : "Install the app for the best mobile experience and offline access."}
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            fontSize: "20px",
            cursor: "pointer",
            lineHeight: 1,
            padding: "0 4px",
          }}
        >
          ×
        </button>
      </div>

      {showBanner && (
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={install}
            style={{
              flex: 1,
              padding: "10px",
              background: "#00d4c0",
              color: "#061a1a",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Install
          </button>
          <button
            onClick={dismiss}
            style={{
              flex: 1,
              padding: "10px",
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Not now
          </button>
        </div>
      )}
    </div>
  );
}
