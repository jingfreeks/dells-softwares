import type { OnboardingStep } from "../../../lib/onboarding";

export interface OnboardingStepHeaderProps {
  step: OnboardingStep;
  stepNumber: number;
  totalSteps: number;
  title: string;
  onBack?: () => void;
  onSkip?: () => void;
}
