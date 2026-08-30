import { Pressable, Text, TextInput, View } from "react-native";
import { colors } from "../../../../../theme/colors";
import { PESO } from "../../../../../lib/money";
import { CustomerResultRow } from "./component";
import type { CreditPaymentProps } from "./types";

export function CreditPayment({
  customerQuery,
  onCustomerQueryChange,
  customerResults,
  selectedCustomer,
  onSelectCustomer,
  onClearCustomer,
  creditWarning,
}: CreditPaymentProps) {
  return (
    <View className="mt-3 mb-3.5">
      <Text className="text-[12.5px] text-text-dim mb-1.5">Charge to customer</Text>
      {selectedCustomer ? (
        <View className="flex-row justify-between items-center border border-hairline bg-panel-strong rounded-input px-3.5 py-[11px]">
          <View>
            <Text className="text-[13.5px] font-medium text-text-primary">{selectedCustomer.name}</Text>
            <Text className="text-[11.5px] text-text-faint mt-0.5">
              Balance {PESO.format(selectedCustomer.balance)}
              {selectedCustomer.creditLimit !== null ? ` · limit ${PESO.format(selectedCustomer.creditLimit)}` : ""}
            </Text>
          </View>
          <Pressable onPress={onClearCustomer}>
            <Text className="text-[12.5px] text-accent-soft">Change</Text>
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
            className="border border-hairline bg-panel-strong rounded-input px-3.5 py-3 text-base text-text-primary"
          />
          {customerResults.length > 0 && (
            <View className="border border-hairline rounded-input mt-1.5 max-h-40 overflow-hidden">
              {customerResults.map((c) => (
                <CustomerResultRow key={c.id} customer={c} onSelect={onSelectCustomer} />
              ))}
            </View>
          )}
        </>
      )}
      {creditWarning && (
        <Text accessibilityRole="alert" className="text-warning text-xs mt-2">
          {creditWarning}
        </Text>
      )}
    </View>
  );
}
