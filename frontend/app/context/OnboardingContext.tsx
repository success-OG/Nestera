"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const ONBOARDING_STORAGE_KEY = "nestera-onboarding-completed";

interface OnboardingContextValue {
  isOnboardingCompleted: boolean;
  isOnboardingActive: boolean;
  currentStep: number;
  startOnboarding: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  skipOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function readInitialOnboardingState(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(() =>
    readInitialOnboardingState()
  );
  const [isOnboardingActive, setIsOnboardingActive] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);

  useEffect(() => {
    if (!isOnboardingCompleted) {
      setIsOnboardingActive(true);
    }
  }, [isOnboardingCompleted]);

  const startOnboarding = useCallback(() => {
    setCurrentStep(0);
    setIsOnboardingActive(true);
  }, []);

  const completeOnboarding = useCallback(() => {
    setIsOnboardingActive(false);
    setIsOnboardingCompleted(true);
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch {}
  }, []);

  const resetOnboarding = useCallback(() => {
    setIsOnboardingCompleted(false);
    try {
      window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {}
    startOnboarding();
  }, [startOnboarding]);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => prev + 1);
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const skipOnboarding = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  const value = useMemo(
    () => ({
      isOnboardingCompleted,
      isOnboardingActive,
      currentStep,
      startOnboarding,
      completeOnboarding,
      resetOnboarding,
      nextStep,
      prevStep,
      goToStep,
      skipOnboarding,
    }),
    [
      isOnboardingCompleted,
      isOnboardingActive,
      currentStep,
      startOnboarding,
      completeOnboarding,
      resetOnboarding,
      nextStep,
      prevStep,
      goToStep,
      skipOnboarding,
    ]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
