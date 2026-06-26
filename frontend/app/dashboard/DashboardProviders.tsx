"use client";

import React from "react";
import { FeatureFlagProvider } from "../context/FeatureFlagContext";
import { WalletProvider } from "../context/WalletContext";
import { ThemeProvider } from "../context/ThemeContext";
import { ToastProvider } from "../context/ToastContext";
import { OnboardingProvider } from "../context/OnboardingContext";
import { OnboardingWizard } from "../components/OnboardingWizard";

/**
 * Client-side providers for the dashboard.
 * Bridges server layout → client context.
 */
export default function DashboardProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <WalletProvider>
          <OnboardingProvider>
            <FeatureFlagProvider>
              {children}
              <OnboardingWizard />
            </FeatureFlagProvider>
          </OnboardingProvider>
        </WalletProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
