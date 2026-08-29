import type { CartLine, Customer, Discount, PaymentType, Product, ServiceLine } from "@/lib";
import {
  PESO,
  wouldExceedCreditLimit,
  LABEL_CURRENT_SALE,
  TABLE_HEADER_TOTAL,
  BUTTON_ADD_DISCOUNT,
  LABEL_SUBTOTAL,
  LABEL_DISCOUNT,
  LABEL_DISCOUNT_TYPE,
  LABEL_DISCOUNT_VALUE,
  LABEL_DISCOUNT_TYPE_FLAT,
  LABEL_DISCOUNT_TYPE_PERCENTAGE,
} from "@/lib";
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
  subtotal: number;
  total: number;
  discountsEnabled: boolean;
  discountType: Discount["type"] | null;
  onDiscountTypeChange: (type: Discount["type"] | null) => void;
  discountValue: string;
  onDiscountValueChange: (value: string) => void;
  discountAmount: number;
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
  holdError: string | null;
  checkingOut: boolean;
  holdingSale: boolean;
  onCancelSale: () => void;
  onCompleteSale: () => void;
  onHold: () => void;
}

export function CartPanel({
  cart,
  serviceLines,
  packPricingEnabled,
  priceLabel,
  onIncrement,
  onRemove,
  onRemoveService,
  subtotal,
  total,
  discountsEnabled,
  discountType,
  onDiscountTypeChange,
  discountValue,
  onDiscountValueChange,
  discountAmount,
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
  holdError,
  checkingOut,
  holdingSale,
  onCancelSale,
  onCompleteSale,
  onHold,
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
    <div
      className="tpl-root flex flex-col tpl-card md:h-full md:min-h-0 md:w-[360px] md:flex-none"
      style={{ padding: 0 }}
    >
      <div className="tpl-sp" style={{ padding: 14 }}>
        <p className="tpl-h3">{LABEL_CURRENT_SALE}</p>
        {cart.length + serviceLines.length > 0 && (
          <span className="tpl-chip tpl-on">{cart.length + serviceLines.length} items</span>
        )}
      </div>

      <div className="md:min-h-0 md:flex-1 md:overflow-y-auto" style={{ padding: "0 14px" }}>
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
        {discountsEnabled && (
          <div style={{ marginBottom: 14 }}>
            {discountType === null ? (
              <button
                type="button"
                className="tpl-lnk"
                style={{ fontSize: 12 }}
                onClick={() => onDiscountTypeChange("percentage")}
              >
                {BUTTON_ADD_DISCOUNT}
              </button>
            ) : (
              <div className="tpl-fld" style={{ gap: 8, alignItems: "center" }}>
                <label className="tpl-lbl" htmlFor="discount-type">
                  {LABEL_DISCOUNT_TYPE}
                </label>
                <select
                  id="discount-type"
                  value={discountType}
                  onChange={(e) => onDiscountTypeChange(e.target.value as Discount["type"])}
                >
                  <option value="percentage">{LABEL_DISCOUNT_TYPE_PERCENTAGE}</option>
                  <option value="flat">{LABEL_DISCOUNT_TYPE_FLAT}</option>
                </select>
                <label className="tpl-lbl" htmlFor="discount-value">
                  {LABEL_DISCOUNT_VALUE}
                </label>
                <input
                  id="discount-value"
                  type="number"
                  min={0}
                  max={discountType === "percentage" ? 100 : undefined}
                  value={discountValue}
                  onChange={(e) => onDiscountValueChange(e.target.value)}
                  style={{ width: 72 }}
                />
                <button type="button" className="tpl-lnk" style={{ fontSize: 12 }} onClick={() => onDiscountTypeChange(null)}>
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        {discountAmount > 0 && (
          <>
            <div className="tpl-sp" style={{ marginBottom: 4 }}>
              <span className="tpl-ts">{LABEL_SUBTOTAL}</span>
              <span className="tpl-ts">{PESO.format(subtotal)}</span>
            </div>
            <div className="tpl-sp" style={{ marginBottom: 4 }}>
              <span className="tpl-ts">{LABEL_DISCOUNT}</span>
              <span className="tpl-ts">-{PESO.format(discountAmount)}</span>
            </div>
          </>
        )}

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
          holdError={holdError}
          hasServiceLines={serviceLines.length > 0}
        />

        <CheckoutActions
          cartEmpty={cartEmpty}
          checkingOut={checkingOut}
          disableComplete={disableComplete}
          needsOwnerPin={needsOwnerPin}
          holdingSale={holdingSale}
          onCancel={onCancelSale}
          onComplete={onCompleteSale}
          onHold={onHold}
        />
      </div>
    </div>
  );
}
