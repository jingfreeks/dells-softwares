import { Modal, Pressable, Text, View } from "react-native";
import { Card } from "../../../../components/card";
import { PasswordInput } from "../../../../components/passwordinput";
import { PrimaryButton } from "../../../../components/primarybutton";
import { colors } from "../../../../theme/colors";
import { useChangePasswordModal } from "./hooks";
import type { ChangePasswordModalProps } from "./types";

export function ChangePasswordModal(props: ChangePasswordModalProps) {
  const { onClose } = props;
  const { password, setPassword, confirmPassword, setConfirmPassword, submitting, error, submit } =
    useChangePasswordModal(props);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-center p-5" style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}>
        <Card padding={18} style={{ backgroundColor: colors.panelSurface }}>
          <Text className="text-[15px] font-medium text-text-primary mb-1">Change your password</Text>
          <Text className="text-[12.5px] text-text-faint mb-3.5">At least 8 characters.</Text>
          <PasswordInput
            accessibilityLabel="New password"
            label="New password"
            value={password}
            onChangeText={setPassword}
          />
          <View className="h-3" />
          <PasswordInput
            accessibilityLabel="Confirm new password"
            label="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          {error && (
            <Text accessibilityRole="alert" className="text-error text-[12.5px] mt-2 mb-1.5">
              {error}
            </Text>
          )}
          <View className="h-3" />
          <PrimaryButton label="Update password" onPress={submit} loading={submitting} />
          <Pressable accessibilityRole="button" onPress={onClose} className="items-center mt-2.5">
            <Text className="text-[13px] text-text-faint">Cancel</Text>
          </Pressable>
        </Card>
      </View>
    </Modal>
  );
}
