import type { DenominationCounts } from "../../../../../lib/onboarding";

export interface DenominationCardProps {
  denominationCounts: DenominationCounts;
  onDenominationCountChange: (key: string, quantity: number) => void;
}
