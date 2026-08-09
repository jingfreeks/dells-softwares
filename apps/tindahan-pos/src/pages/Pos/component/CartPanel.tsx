import type { CartLine, Customer, PaymentType, Product, ServiceLine } from "@/lib";
import { PESO, wouldExceedCreditLimit, LABEL_CURRENT_SALE, TABLE_HEADER_TOTAL } from "@/lib";
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
  quickCashAmounts: number[];
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
  quickCashAmounts,
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
  const needsOwnerPin =
    paymentType === "credit" && selectedCustomer !== null && wouldExceedCreditLimit(selectedCustomer, total);
  const disableComplete =
    cartEmpty ||
    (paymentType === "cash"
      ? change === null
      : paymentType === "qr"
        ? referenceNo.trim() === ""
        : !selectedCustomer) ||
    checkingOut;

  return (
    <div className="tpl-root flex flex-col tpl-card" style={{ padding: 0 }}>
      <div className="tpl-sp" style={{ padding: 14 }}>
        <p className="tpl-h3">{LABEL_CURRENT_SALE}</p>
        {cart.length + serviceLines.length > 0 && (
          <span className="tpl-chip tpl-on">{cart.length + serviceLines.length} items</span>
        )}
      </div>

      <div className="lg:flex-1 lg:overflow-y-auto" style={{ padding: "0 14px" }}>
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

      <div style={{ padding: 14 }}>
        <div className="tpl-sp" style={{ marginBottom: 14 }}>
          <span className="tpl-h3">{TABLE_HEADER_TOTAL}</span>
          <span data-testid="cart-total" style={{ color: "var(--tpl-t1)", fontSize: 28, fontWeight: 500 }}>
            {PESO.format(total)}
          </span>
        </div>

        <PaymentMethodTabs paymentType={paymentType} onSelect={onSelectPaymentType} />

        {paymentType === "cash" && (
          <CashPaymentFields
            tendered={tendered}
            onTenderedChange={onTenderedChange}
            quickCashAmounts={quickCashAmounts}
            change={change}
          />
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
          needsOwnerPin={needsOwnerPin}
          onCancel={onCancelSale}
          onComplete={onCompleteSale}
        />
      </div>
    </div>
  );
}
