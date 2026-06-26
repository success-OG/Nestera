// Stub Feature Flag Context for MVP
import React, { createContext, useContext, ReactNode } from "react";

const FeatureFlagContext = createContext<Record<string, boolean>>({});

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
    // All features enabled for MVP
    const flags = {};

    return (
        <FeatureFlagContext.Provider value={flags}>
            {children}
        </FeatureFlagContext.Provider>
    );
}

export function useFeatureFlag(flag: string): boolean {
    const flags = useContext(FeatureFlagContext);
    return flags[flag] ?? true; // Default to enabled
}
