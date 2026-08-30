import { Modal, Pressable, Text, View } from "react-native";
import { Card } from "../../../../components/card";
import { PrimaryButton } from "../../../../components/primarybutton";
import { TextField } from "../../../../components/textfield";
import { colors } from "../../../../theme/colors";
import { useChangePinModal } from "./hooks";
import type { ChangePinModalProps } from "./types";

export function ChangePinModal(props: ChangePinModalProps) {
  const { hasPin, onClose } = props;
  const { pin, setPin, confirmPin, setConfirmPin, submitting, error, submit } = useChangePinModal(props);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-center p-5" style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}>
        <Card padding={18} style={{ backgroundColor: colors.panelSurface }}>
          <Text className="text-[15px] font-medium text-text-primary mb-1">
            {hasPin ? "Change your override PIN" : "Set your override PIN"}
          </Text>
          <Text className="text-[12.5px] text-text-faint mb-3.5">
            Four digits. Approves voids, big cash-outs and utang over the limit.
          </Text>
          <TextField
            accessibilityLabel="New PIN"
            label="New PIN"
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
          />
          <View className="h-3" />
          <TextField
            accessibilityLabel="Confirm new PIN"
            label="Confirm new PIN"
            value={confirmPin}
            onChangeText={setConfirmPin}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
          />
          {error && (
            <Text accessibilityRole="alert" className="text-error text-[12.5px] mt-2 mb-1.5">
              {error}
            </Text>
          )}
          <View className="h-3" />
          <PrimaryButton label={hasPin ? "Update PIN" : "Set PIN"} onPress={submit} loading={submitting} />
          <Pressable accessibilityRole="button" onPress={onClose} className="items-center mt-2.5">
            <Text className="text-[13px] text-text-faint">Cancel</Text>
          </Pressable>
        </Card>
      </View>
    </Modal>
  );
}
