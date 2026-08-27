import type { DenominationCounts } from "../../../lib/onboarding";

export interface OpenRegisterStepProps {
  denominationCounts: DenominationCounts;
  onDenominationCountChange: (key: string, quantity: number) => void;
  averageSaleValue: number;
  assignedStaffName: string;
  onOpenRegister: () => void;
  onSkipCount: () => void;
  onBack: () => void;
}
