"use client";

import React from "react";
import { useOnboarding } from "../context/OnboardingContext";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles, X } from "lucide-react";
import { Button } from "./ui/Button";

const ONBOARDING_STEPS = [
  {
    title: "Welcome to Nestera!",
    description: "Your gateway to smart savings and decentralized finance.",
    icon: <Sparkles className="w-12 h-12 text-emerald-400" />,
  },
  {
    title: "Connect Your Wallet",
    description: "Link your crypto wallet to start using all features.",
    icon: <ArrowRight className="w-12 h-12 text-blue-400" />,
  },
  {
    title: "Explore the Dashboard",
    description: "Get familiar with your portfolio, goals, and savings pools.",
    icon: <CheckCircle2 className="w-12 h-12 text-purple-400" />,
  },
  {
    title: "Create Your First Goal",
    description: "Set a savings target and start growing your funds.",
    icon: <Sparkles className="w-12 h-12 text-amber-400" />,
  },
  {
    title: "Make Your First Deposit",
    description: "Fund your goal and watch your savings grow with yield.",
    icon: <CheckCircle2 className="w-12 h-12 text-rose-400" />,
  },
  {
    title: "You're All Set!",
    description: "Congratulations! You're ready to start your savings journey.",
    icon: <Sparkles className="w-12 h-12 text-emerald-400" />,
  },
];

export function OnboardingWizard() {
  const {
    isOnboardingActive,
    currentStep,
    nextStep,
    prevStep,
    completeOnboarding,
    skipOnboarding,
  } = useOnboarding();

  if (!isOnboardingActive) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-gray-900 p-8 shadow-2xl border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <span className="text-sm text-gray-400">
            Step {currentStep + 1} of {ONBOARDING_STEPS.length}
          </span>
          <button
            onClick={skipOnboarding}
            className="text-sm text-gray-400 hover:text-white transition-colors"
            aria-label="Skip onboarding"
          >
            Skip
          </button>
        </div>

        <div className="w-full h-2 bg-gray-800 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-300"
            style={{
              width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%`,
            }}
          />
        </div>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-6 p-4 rounded-full bg-gray-800">
            {step.icon}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{step.title}</h2>
          <p className="text-gray-400">{step.description}</p>
        </div>

        <div className="flex gap-3">
          {!isFirstStep && (
            <Button
              variant="secondary"
              onClick={prevStep}
              className="flex-1"
              aria-label="Previous step"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
          )}
          <Button
            variant="primary"
            onClick={isLastStep ? completeOnboarding : nextStep}
            className={isFirstStep ? "flex-1" : "flex-1"}
            aria-label={isLastStep ? "Complete onboarding" : "Next step"}
          >
            {isLastStep ? "Get Started" : "Next"}
            {!isLastStep && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
