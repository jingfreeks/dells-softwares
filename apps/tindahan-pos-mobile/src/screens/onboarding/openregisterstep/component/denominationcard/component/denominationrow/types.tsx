import type { DenominationDef } from "../../../../../../../lib/onboarding";

export interface DenominationRowProps {
  def: DenominationDef;
  quantity: number;
  onQuantityChange: (key: string, quantity: number) => void;
}
