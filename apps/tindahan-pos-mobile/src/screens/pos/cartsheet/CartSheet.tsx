import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { colors } from "../../../theme/colors";
import { SegmentedControl } from "../../../components/SegmentedControl";
import {
  CartItemRow,
  CashPayment,
  CreditPayment,
  DiscountSection,
  PayButton,
  QrPayment,
  SummaryTotals,
} from "./component";
import { PAYMENT_SEGMENTS } from "./types";
import type { CartSheetProps } from "./types";

/** The bottom-sheet cart (mobile-cashier-register.html's "cart sheet" panel). */
export function CartSheet({
  visible,
  onClose,
  cart,
  onIncrement,
  onDecrement,
  subtotal,
  discountAmount,
  total,
  discountEnabled,
  discountType,
  discountValueText,
  onToggleDiscount,
  onDiscountTypeChange,
  onDiscountValueChange,
  paymentSegment,
  onPaymentSegmentChange,
  paymentType,
  tendered,
  onTenderedChange,
  change,
  referenceNo,
  onReferenceNoChange,
  customerQuery,
  onCustomerQueryChange,
  customerResults,
  selectedCustomer,
  onSelectCustomer,
  onClearCustomer,
  creditWarning,
  checkingOut,
  checkoutError,
  canComplete,
  onCompleteSale,
}: CartSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1" style={{ backgroundColor: "rgba(0, 0, 0, 0.55)" }} onPress={onClose} />
      <View
        className="absolute left-0 right-0 bottom-0 rounded-t-[20px] border border-hairline"
        style={{ maxHeight: "88%", backgroundColor: colors.panelSurface }}
      >
        <View className="items-center pt-2.5">
          <View className="w-10 h-1 rounded-[2px] bg-hairline" />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28 }}>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-base font-medium text-text-primary">Current sale</Text>
            <View className="bg-panel-strong rounded-pill px-2.5 py-[3px]">
              <Text className="text-xs text-text-dim">{cart.length} items</Text>
            </View>
          </View>

          {cart.length === 0 ? (
            <Text className="text-text-faint text-[13px] py-5 text-center">Cart is empty.</Text>
          ) : (
            <View className="border-b border-hairline-faint mb-2.5">
              {cart.map((line) => (
                <CartItemRow key={line.product.id} line={line} onIncrement={onIncrement} onDecrement={onDecrement} />
              ))}
            </View>
          )}

          <DiscountSection
            discountEnabled={discountEnabled}
            discountType={discountType}
            discountValueText={discountValueText}
            onToggleDiscount={onToggleDiscount}
            onDiscountTypeChange={onDiscountTypeChange}
            onDiscountValueChange={onDiscountValueChange}
          />

          <SummaryTotals subtotal={subtotal} discountAmount={discountAmount} total={total} />

          <SegmentedControl
            options={PAYMENT_SEGMENTS}
            value={paymentSegment}
            onChange={(v) => onPaymentSegmentChange(v as (typeof PAYMENT_SEGMENTS)[number])}
          />

          {paymentType === "cash" && (
            <CashPayment total={total} tendered={tendered} onTenderedChange={onTenderedChange} change={change} />
          )}

          {paymentType === "qr" && <QrPayment referenceNo={referenceNo} onReferenceNoChange={onReferenceNoChange} />}

          {paymentType === "credit" && (
            <CreditPayment
              customerQuery={customerQuery}
              onCustomerQueryChange={onCustomerQueryChange}
              customerResults={customerResults}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={onSelectCustomer}
              onClearCustomer={onClearCustomer}
              creditWarning={creditWarning}
            />
          )}

          {checkoutError && (
            <Text accessibilityRole="alert" className="text-error text-[13px] mt-2.5">
              {checkoutError}
            </Text>
          )}

          <PayButton
            checkingOut={checkingOut}
            canComplete={canComplete}
            onCompleteSale={onCompleteSale}
            total={total}
            paymentSegmentLabel={paymentSegment}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}
