import type { CheckoutDiscount } from "../../../lib/storeData";
import type { CartLine, Customer, PaymentType } from "../../../lib/types";

export const PAYMENT_SEGMENTS = ["Cash", "GCash", "Utang"] as const;

export interface CartSheetProps {
  visible: boolean;
  onClose: () => void;
  cart: CartLine[];
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;

  subtotal: number;
  discountAmount: number;
  total: number;
  discountEnabled: boolean;
  discountType: CheckoutDiscount["type"];
  discountValueText: string;
  onToggleDiscount: () => void;
  onDiscountTypeChange: (type: CheckoutDiscount["type"]) => void;
  onDiscountValueChange: (value: string) => void;

  paymentSegment: (typeof PAYMENT_SEGMENTS)[number];
  onPaymentSegmentChange: (segment: (typeof PAYMENT_SEGMENTS)[number]) => void;
  paymentType: PaymentType;

  tendered: string;
  onTenderedChange: (value: string) => void;
  change: number | null;

  referenceNo: string;
  onReferenceNoChange: (value: string) => void;

  customerQuery: string;
  onCustomerQueryChange: (value: string) => void;
  customerResults: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer) => void;
  onClearCustomer: () => void;
  creditWarning: string | null;

  checkingOut: boolean;
  checkoutError: string | null;
  canComplete: boolean;
  onCompleteSale: () => void;
}
