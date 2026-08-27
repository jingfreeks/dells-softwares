import { Modal, Pressable, Text, View } from "react-native";
import { Card } from "../../../../components/Card";
import { PrimaryButton } from "../../../../components/PrimaryButton";
import { TextField } from "../../../../components/TextField";
import { colors } from "../../../../theme/colors";
import { useUnpairModal } from "./hooks";
import type { UnpairModalProps } from "./types";

export function UnpairModal(props: UnpairModalProps) {
  const { device, onClose } = props;
  const { ownerPin, setOwnerPin, submitting, error, submitUnpair } = useUnpairModal(props);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-center p-5" style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}>
        <Card padding={18} style={{ backgroundColor: colors.panelSurface }}>
          <Text className="text-[15px] font-medium text-text-primary mb-1">Unpair {device.name}?</Text>
          <Text className="text-[12.5px] text-text-faint mb-3.5">Enter your PIN to confirm.</Text>
          <TextField
            accessibilityLabel="Owner PIN"
            value={ownerPin}
            onChangeText={setOwnerPin}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
          />
          {error && (
            <Text accessibilityRole="alert" className="text-error text-[12.5px] mt-2 mb-1.5">
              {error}
            </Text>
          )}
          <PrimaryButton label="Unpair device" onPress={submitUnpair} loading={submitting} />
          <Pressable accessibilityRole="button" onPress={onClose} className="items-center mt-2.5">
            <Text className="text-[13px] text-text-faint">Cancel</Text>
          </Pressable>
        </Card>
      </View>
    </Modal>
  );
}
