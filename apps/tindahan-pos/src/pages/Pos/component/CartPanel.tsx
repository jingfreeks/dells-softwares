import type { CartLine, Customer, PaymentType, Product, ServiceLine } from "@/lib";
import { PESO, LABEL_CURRENT_SALE, TABLE_HEADER_TOTAL } from "@/lib";
import { CartItemsList } from "./CartItemsList";
import { PaymentMethodTabs } from "./PaymentMethodTabs";
import { CashPaymentFields } from "./CashPaymentFields";
import { QrPaymentFields } from "./QrPaymentFields";
import { CreditPaymentFields } from "./CreditPaymentFields";
import { CheckoutStatusMessages } from "./CheckoutStatusMessages";
import { CheckoutActions } from "./CheckoutActions";

interface CartPanelProps {
  cart: CartLine[];
  serviceLines: ServiceLine[];
  packPricingEnabled: boolean;
  priceLabel: (product: Product) => string | null;
  onIncrement: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onRemoveService: (id: string) => void;
  total: number;
  paymentType: PaymentType;
  onSelectPaymentType: (type: PaymentType) => void;
  tendered: string;
  onTenderedChange: (value: string) => void;
  change: number | null;
  referenceNo: string;
  onReferenceNoChange: (value: string) => void;
  selectedCustomer: Customer | null;
  onClearCustomer: () => void;
  customerQuery: string;
  onCustomerQueryChange: (value: string) => void;
  customerResults: Customer[];
  onSelectCustomer: (id: string) => void;
  addingCustomer: boolean;
  onQuickAddCustomer: () => void;
  customerError: string | null;
  lastReceiptTotal: number | null;
  checkoutError: string | null;
  checkingOut: boolean;
  onCancelSale: () => void;
  onCompleteSale: () => void;
}

export function CartPanel({
  cart,
  serviceLines,
  packPricingEnabled,
  priceLabel,
  onIncrement,
  onRemove,
  onRemoveService,
  total,
  paymentType,
  onSelectPaymentType,
  tendered,
  onTenderedChange,
  change,
  referenceNo,
  onReferenceNoChange,
  selectedCustomer,
  onClearCustomer,
  customerQuery,
  onCustomerQueryChange,
  customerResults,
  onSelectCustomer,
  addingCustomer,
  onQuickAddCustomer,
  customerError,
  lastReceiptTotal,
  checkoutError,
  checkingOut,
  onCancelSale,
  onCompleteSale,
}: CartPanelProps) {
  const cartEmpty = cart.length === 0 && serviceLines.length === 0;
  const disableComplete =
    cartEmpty ||
    (paymentType === "cash"
      ? change === null
      : paymentType === "qr"
        ? referenceNo.trim() === ""
        : !selectedCustomer) ||
    checkingOut;

  return (
    <div className="flex flex-col card">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          {LABEL_CURRENT_SALE}
          {cart.length + serviceLines.length > 0 && ` (${cart.length + serviceLines.length} items)`}
        </h2>
      </div>

      <div className="p-4 lg:flex-1 lg:overflow-y-auto">
        <CartItemsList
          cart={cart}
          serviceLines={serviceLines}
          packPricingEnabled={packPricingEnabled}
          priceLabel={priceLabel}
          onIncrement={onIncrement}
          onRemove={onRemove}
          onRemoveService={onRemoveService}
        />
      </div>

      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{TABLE_HEADER_TOTAL}</span>
          <span data-testid="cart-total" className="tabular-nums text-xl font-bold tracking-tight text-slate-900">
            {PESO.format(total)}
          </span>
        </div>

        <PaymentMethodTabs paymentType={paymentType} onSelect={onSelectPaymentType} />

        {paymentType === "cash" && (
          <CashPaymentFields tendered={tendered} onTenderedChange={onTenderedChange} change={change} />
        )}

        {paymentType === "qr" && (
          <QrPaymentFields total={total} referenceNo={referenceNo} onReferenceNoChange={onReferenceNoChange} />
        )}

        {paymentType === "credit" && (
          <CreditPaymentFields
            total={total}
            selectedCustomer={selectedCustomer}
            onClearCustomer={onClearCustomer}
            customerQuery={customerQuery}
            onCustomerQueryChange={onCustomerQueryChange}
            customerResults={customerResults}
            onSelectCustomer={onSelectCustomer}
            addingCustomer={addingCustomer}
            onQuickAddCustomer={onQuickAddCustomer}
            customerError={customerError}
          />
        )}

        <CheckoutStatusMessages
          lastReceiptTotal={lastReceiptTotal}
          checkoutError={checkoutError}
          hasServiceLines={serviceLines.length > 0}
        />

        <CheckoutActions
          cartEmpty={cartEmpty}
          checkingOut={checkingOut}
          disableComplete={disableComplete}
          onCancel={onCancelSale}
          onComplete={onCompleteSale}
        />
      </div>
    </div>
  );
}
