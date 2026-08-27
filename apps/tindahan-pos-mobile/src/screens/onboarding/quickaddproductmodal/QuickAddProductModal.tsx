import { Modal, Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../../components/card";
import { PrimaryButton } from "../../../components/primarybutton";
import { TextField } from "../../../components/TextField";
import { colors } from "../../../theme/colors";
import type { QuickAddProductModalProps } from "./types";

/** Small "type it in" quick-add modal for Onboarding's Products step. */
export function QuickAddProductModal({ form, onFormChange, error, saving, onSubmit, onClose }: QuickAddProductModalProps) {
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-center p-5" style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}>
        <Card padding={18} style={{ backgroundColor: colors.panelSurface }}>
          <View className="flex-row justify-between items-center mb-3.5">
            <Text className="text-[15px] font-medium text-text-primary">Add a product</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={8}>
              <Feather name="x" size={18} color={colors.textFaint} />
            </Pressable>
          </View>

          <TextField
            accessibilityLabel="Product name"
            label="Name"
            value={form.name}
            onChangeText={(name) => onFormChange({ ...form, name })}
          />
          <TextField
            accessibilityLabel="Price"
            label="Price"
            value={form.price}
            onChangeText={(price) => onFormChange({ ...form, price })}
            keyboardType="decimal-pad"
          />
          <TextField
            accessibilityLabel="Barcode"
            label="Barcode (optional)"
            value={form.barcode}
            onChangeText={(barcode) => onFormChange({ ...form, barcode })}
          />

          {error && (
            <Text accessibilityRole="alert" className="text-error text-xs mb-2.5">
              {error}
            </Text>
          )}

          <PrimaryButton label="Add product" onPress={onSubmit} loading={saving} />
        </Card>
      </View>
    </Modal>
  );
}
