import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, radii } from "../../theme/colors";
import { PESO } from "../../lib/money";
import { lineTotal, quickCashAmounts } from "../../lib/pos";
import { SegmentedControl } from "../../components/SegmentedControl";
import type { CheckoutDiscount } from "../../lib/storeData";
import type { CartLine, Customer, PaymentType } from "../../lib/types";

const PAYMENT_SEGMENTS = ["Cash", "GCash", "Utang"] as const;

interface CartSheetProps {
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
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grabWrap}>
          <View style={styles.grab} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Current sale</Text>
            <View style={styles.itemsPill}>
              <Text style={styles.itemsPillText}>{cart.length} items</Text>
            </View>
          </View>

          {cart.length === 0 ? (
            <Text style={styles.emptyText}>Cart is empty.</Text>
          ) : (
            <View style={styles.itemsList}>
              {cart.map((line) => (
                <View key={line.product.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{line.product.name}</Text>
                    <Text style={styles.itemUnit}>{PESO.format(line.product.price)} each</Text>
                  </View>
                  <View style={styles.stepperRow}>
                    <Pressable
                      accessibilityLabel={`Decrease quantity of ${line.product.name}`}
                      onPress={() => onDecrement(line.product.id)}
                      style={styles.step}
                    >
                      <Text style={styles.stepText}>−</Text>
                    </Pressable>
                    <Text style={styles.itemQty}>{line.quantity}</Text>
                    <Pressable
                      accessibilityLabel={`Increase quantity of ${line.product.name}`}
                      onPress={() => onIncrement(line.product.id)}
                      style={styles.step}
                    >
                      <Text style={styles.stepText}>+</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.itemAmount}>{PESO.format(lineTotal(line.product, line.quantity))}</Text>
                </View>
              ))}
            </View>
          )}

          {!discountEnabled ? (
            <Pressable accessibilityRole="button" onPress={onToggleDiscount}>
              <Text style={styles.discountLink}>+ Add discount</Text>
            </Pressable>
          ) : (
            <View style={styles.discountRow}>
              <View style={styles.discountTypeRow}>
                <Pressable
                  onPress={() => onDiscountTypeChange("percentage")}
                  style={[styles.discountTypeButton, discountType === "percentage" && styles.discountTypeButtonOn]}
                >
                  <Text style={[styles.discountTypeText, discountType === "percentage" && styles.discountTypeTextOn]}>%</Text>
                </Pressable>
                <Pressable
                  onPress={() => onDiscountTypeChange("flat")}
                  style={[styles.discountTypeButton, discountType === "flat" && styles.discountTypeButtonOn]}
                >
                  <Text style={[styles.discountTypeText, discountType === "flat" && styles.discountTypeTextOn]}>₱</Text>
                </Pressable>
              </View>
              <TextInput
                accessibilityLabel="Discount value"
                placeholder={discountType === "percentage" ? "10" : "50"}
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={discountValueText}
                onChangeText={onDiscountValueChange}
                style={styles.discountInput}
              />
              <Pressable accessibilityLabel="Remove discount" onPress={onToggleDiscount}>
                <Feather name="x" size={16} color={colors.textFaint} />
              </Pressable>
            </View>
          )}

          {discountAmount > 0 && (
            <>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>Subtotal</Text>
                <Text style={styles.sumValue}>{PESO.format(subtotal)}</Text>
              </View>
              <View style={[styles.sumRow, styles.sumRowLast]}>
                <Text style={styles.sumLabel}>Discount</Text>
                <Text style={styles.discountValue}>−{PESO.format(discountAmount)}</Text>
              </View>
            </>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{PESO.format(total)}</Text>
          </View>

          <SegmentedControl
            options={PAYMENT_SEGMENTS}
            value={paymentSegment}
            onChange={(v) => onPaymentSegmentChange(v as (typeof PAYMENT_SEGMENTS)[number])}
          />

          {paymentType === "cash" && (
            <>
              <View style={styles.cashRow}>
                {quickCashAmounts(total).map((amount) => (
                  <Pressable
                    key={amount}
                    onPress={() => onTenderedChange(String(amount))}
                    style={[styles.cashChip, Number(tendered) === amount && styles.cashChipOn]}
                  >
                    <Text style={[styles.cashChipText, Number(tendered) === amount && styles.cashChipTextOn]}>
                      {PESO.format(amount)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                accessibilityLabel="Amount tendered"
                keyboardType="decimal-pad"
                value={tendered}
                onChangeText={onTenderedChange}
                placeholderTextColor={colors.textMuted}
                style={styles.tenderedInput}
              />
              <View style={[styles.changeBox, change !== null && change >= 0 && styles.changeBoxOk]}>
                <Text style={styles.changeLabel}>Change</Text>
                <Text style={styles.changeValue}>{change === null ? "—" : PESO.format(change)}</Text>
              </View>
            </>
          )}

          {paymentType === "qr" && (
            <View style={styles.fieldSpacing}>
              <Text style={styles.fieldLabel}>GCash reference number</Text>
              <TextInput
                accessibilityLabel="GCash reference number"
                placeholder="e.g. 1234567890"
                placeholderTextColor={colors.textMuted}
                value={referenceNo}
                onChangeText={onReferenceNoChange}
                style={styles.tenderedInput}
              />
            </View>
          )}

          {paymentType === "credit" && (
            <View style={styles.fieldSpacing}>
              <Text style={styles.fieldLabel}>Charge to customer</Text>
              {selectedCustomer ? (
                <View style={styles.selectedCustomerRow}>
                  <View>
                    <Text style={styles.selectedCustomerName}>{selectedCustomer.name}</Text>
                    <Text style={styles.selectedCustomerBalance}>
                      Balance {PESO.format(selectedCustomer.balance)}
                      {selectedCustomer.creditLimit !== null ? ` · limit ${PESO.format(selectedCustomer.creditLimit)}` : ""}
                    </Text>
                  </View>
                  <Pressable onPress={onClearCustomer}>
                    <Text style={styles.changeLink}>Change</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <TextInput
                    accessibilityLabel="Search by name"
                    placeholder="Search by name"
                    placeholderTextColor={colors.textMuted}
                    value={customerQuery}
                    onChangeText={onCustomerQueryChange}
                    style={styles.tenderedInput}
                  />
                  {customerResults.length > 0 && (
                    <View style={styles.customerResults}>
                      {customerResults.map((c) => (
                        <Pressable key={c.id} style={styles.customerResultRow} onPress={() => onSelectCustomer(c)}>
                          <Text style={styles.selectedCustomerName}>{c.name}</Text>
                          <Text style={styles.selectedCustomerBalance}>{PESO.format(c.balance)}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </>
              )}
              {creditWarning && (
                <Text accessibilityRole="alert" style={styles.warning}>
                  {creditWarning}
                </Text>
              )}
            </View>
          )}

          {checkoutError && (
            <Text accessibilityRole="alert" style={styles.error}>
              {checkoutError}
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            style={[styles.payButton, !canComplete && styles.payButtonDisabled]}
            disabled={!canComplete}
            onPress={onCompleteSale}
          >
            {checkingOut ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <>
                <Text style={styles.payButtonTitle}>Complete sale</Text>
                <Text style={styles.payButtonSubtitle}>
                  {PESO.format(total)} · {paymentSegment.toLowerCase()}
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.55)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "88%",
    backgroundColor: colors.panelSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  grabWrap: { alignItems: "center", paddingTop: 10 },
  grab: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.hairline },
  scrollContent: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  headerTitle: { fontSize: 16, fontWeight: "500", color: colors.textPrimary },
  itemsPill: { backgroundColor: colors.panelStrong, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  itemsPillText: { fontSize: 12, color: colors.textDim },
  emptyText: { color: colors.textFaint, fontSize: 13, paddingVertical: 20, textAlign: "center" },
  itemsList: { borderBottomWidth: 1, borderBottomColor: colors.hairlineFaint, marginBottom: 10 },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, gap: 10 },
  itemName: { fontSize: 13.5, color: colors.textPrimary },
  itemUnit: { fontSize: 11.5, color: colors.textFaint, marginTop: 1 },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  step: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { fontSize: 15, color: colors.textPrimary },
  itemQty: { fontSize: 15, color: colors.textPrimary, minWidth: 16, textAlign: "center" },
  itemAmount: { fontSize: 13.5, color: colors.textPrimary, minWidth: 62, textAlign: "right" },
  discountLink: { fontSize: 13, color: colors.accentSoft, fontWeight: "500", marginBottom: 10 },
  discountRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  discountTypeRow: { flexDirection: "row", borderWidth: 1, borderColor: colors.hairline, borderRadius: 8, overflow: "hidden" },
  discountTypeButton: { paddingHorizontal: 12, paddingVertical: 8 },
  discountTypeButtonOn: { backgroundColor: colors.accent },
  discountTypeText: { fontSize: 13, color: colors.textDim },
  discountTypeTextOn: { color: colors.textPrimary },
  discountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.panelStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  sumRowLast: { borderBottomWidth: 1, borderBottomColor: colors.hairlineFaint, paddingBottom: 10, marginBottom: 4 },
  sumLabel: { fontSize: 13, color: colors.textDim },
  sumValue: { fontSize: 13, color: colors.textDim },
  discountValue: { fontSize: 13, color: colors.success },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 6, marginBottom: 14 },
  totalLabel: { fontSize: 16, fontWeight: "500", color: colors.textPrimary },
  totalValue: { fontSize: 30, fontWeight: "500", color: colors.textStrong },
  cashRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12, marginBottom: 12 },
  cashChip: {
    flexBasis: "23%",
    height: 42,
    borderRadius: 11,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  cashChipOn: { backgroundColor: "rgba(76, 141, 255, 0.16)", borderColor: "rgba(76, 141, 255, 0.35)" },
  cashChipText: { fontSize: 13, color: colors.textDim },
  cashChipTextOn: { color: colors.accentSoft, fontWeight: "500" },
  tenderedInput: {
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.panelStrong,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  changeBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.panel,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 12,
    marginBottom: 14,
  },
  changeBoxOk: { backgroundColor: "rgba(74, 222, 128, 0.07)", borderColor: "rgba(74, 222, 128, 0.28)" },
  changeLabel: { fontSize: 13, color: colors.textDim },
  changeValue: { fontSize: 22, fontWeight: "500", color: colors.success },
  fieldSpacing: { marginTop: 12, marginBottom: 14 },
  fieldLabel: { fontSize: 12.5, color: colors.textDim, marginBottom: 6 },
  selectedCustomerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.input,
    backgroundColor: colors.panelStrong,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  selectedCustomerName: { fontSize: 13.5, fontWeight: "500", color: colors.textPrimary },
  selectedCustomerBalance: { fontSize: 11.5, color: colors.textFaint, marginTop: 2 },
  changeLink: { fontSize: 12.5, color: colors.accentSoft },
  customerResults: { borderWidth: 1, borderColor: colors.hairline, borderRadius: radii.input, marginTop: 6, maxHeight: 160, overflow: "hidden" },
  customerResultRow: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.hairlineFaint },
  warning: { color: colors.warning, fontSize: 12, marginTop: 8 },
  error: { color: colors.error, fontSize: 13, marginTop: 10 },
  payButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.control,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
  },
  payButtonDisabled: { opacity: 0.4 },
  payButtonTitle: { fontSize: 16, fontWeight: "500", color: colors.textPrimary },
  payButtonSubtitle: { fontSize: 11.5, color: colors.textPrimary, opacity: 0.85, marginTop: 2 },
});
