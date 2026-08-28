import type { CheckoutDiscount } from "../../../../../lib/storeData";

export interface DiscountSectionProps {
  discountEnabled: boolean;
  discountType: CheckoutDiscount["type"];
  discountValueText: string;
  onToggleDiscount: () => void;
  onDiscountTypeChange: (type: CheckoutDiscount["type"]) => void;
  onDiscountValueChange: (value: string) => void;
}
