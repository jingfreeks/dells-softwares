import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/PrimaryButton";
import { TextField } from "../../components/TextField";
import { colors } from "../../theme/colors";

export interface QuickAddForm {
  name: string;
  price: string;
  barcode: string;
}

export const EMPTY_QUICK_ADD_FORM: QuickAddForm = { name: "", price: "", barcode: "" };

interface QuickAddProductModalProps {
  form: QuickAddForm;
  onFormChange: (form: QuickAddForm) => void;
  error: string | null;
  saving: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

/** Small "type it in" quick-add modal for Onboarding's Products step. */
export function QuickAddProductModal({ form, onFormChange, error, saving, onSubmit, onClose }: QuickAddProductModalProps) {
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card padding={18} style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Add a product</Text>
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
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}

          <PrimaryButton label="Add product" onPress={onSubmit} loading={saving} />
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "center", padding: 20 },
  card: { backgroundColor: colors.panelSurface },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  title: { fontSize: 15, fontWeight: "500", color: colors.textPrimary },
  error: { color: colors.error, fontSize: 12, marginBottom: 10 },
});
