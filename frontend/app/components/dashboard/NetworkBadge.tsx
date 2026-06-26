"use client";

import React from "react";
import { AlertTriangle, HelpCircle, Rocket, Server, Shield } from "lucide-react";
import { getNetworkConfig, type StellarNetwork } from "../../constants/networks";

export interface NetworkBadgeProps {
  network: StellarNetwork;
  onClick: () => void;
  className?: string;
}

const NETWORK_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Shield,
  AlertTriangle,
  Rocket,
  Server,
  HelpCircle,
};

export const NetworkBadge: React.FC<NetworkBadgeProps> = React.memo(
  ({ network, onClick, className = "" }) => {
    const config = getNetworkConfig(network);
    const IconComponent = NETWORK_ICONS[config.icon] || HelpCircle;
    const ariaLabel = config.showWarning
      ? `Current network: ${config.displayName}. Warning: You are connected to a test network. Click to view network switching instructions.`
      : `Current network: ${config.displayName}. Click to view network switching instructions.`;

    return (
      <>
        <button
          role="button"
          aria-label={ariaLabel}
          aria-describedby={config.showWarning ? "testnet-warning" : undefined}
          onClick={onClick}
          className={[
            "network-badge-responsive relative flex items-center justify-center gap-[6px] rounded-xl border p-0",
            "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] hover:opacity-90",
            config.showWarning ? "animate-pulse-subtle" : "",
            className,
          ].join(" ")}
          style={{
            backgroundColor: config.colors.background,
            borderColor: config.colors.border,
            color: config.colors.primary,
            width: "32px",
            height: "32px",
          }}
        >
          <IconComponent size={14} className="shrink-0" />
          <span
            className="hidden whitespace-nowrap text-xs font-semibold sm:inline"
            style={{ color: config.colors.text, letterSpacing: "0.3px" }}
          >
            {config.displayName}
          </span>
          {config.showWarning ? (
            <span id="testnet-warning" className="sr-only">
              Warning: You are connected to the test network. Transactions will not affect real assets.
            </span>
          ) : null}
          {config.showWarning ? (
            <span
              className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border sm:hidden"
              style={{
                backgroundColor: config.colors.primary,
                borderColor: "var(--color-surface)",
              }}
              aria-hidden="true"
            />
          ) : null}
        </button>
        <style jsx global>{`
          @media (min-width: 640px) {
            .network-badge-responsive {
              width: auto !important;
              height: 36px !important;
              padding: 0 12px !important;
            }
          }

          @media (min-width: 1024px) {
            .network-badge-responsive {
              height: 38px !important;
              padding: 0 16px !important;
            }
          }

          @keyframes pulse-subtle {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0.85;
            }
          }

          .animate-pulse-subtle {
            animation: pulse-subtle 2s ease-in-out infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            .animate-pulse-subtle {
              animation: none;
            }
          }
        `}</style>
      </>
    );
  },
  (prevProps, nextProps) => prevProps.network === nextProps.network
);

NetworkBadge.displayName = "NetworkBadge";

export default NetworkBadge;
