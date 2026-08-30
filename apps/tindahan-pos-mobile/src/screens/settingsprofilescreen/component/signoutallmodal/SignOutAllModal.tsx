import { Modal, Pressable, Text, View } from "react-native";
import { Card } from "../../../../components/card";
import { PrimaryButton } from "../../../../components/primarybutton";
import { colors } from "../../../../theme/colors";
import { useSignOutAllModal } from "./hooks";
import type { SignOutAllModalProps } from "./types";

export function SignOutAllModal(props: SignOutAllModalProps) {
  const { onClose } = props;
  const { submitting, error, submit } = useSignOutAllModal(props);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-center p-5" style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}>
        <Card padding={18} style={{ backgroundColor: colors.panelSurface }}>
          <Text className="text-[15px] font-medium text-text-primary mb-1">Sign out everywhere?</Text>
          <Text className="text-[12.5px] text-text-faint mb-3.5">
            Ends every signed-in session for your account, including this one. You&apos;ll need to sign in again.
          </Text>
          {error && (
            <Text accessibilityRole="alert" className="text-error text-[12.5px] mb-2">
              {error}
            </Text>
          )}
          <PrimaryButton label="Sign out all" onPress={submit} loading={submitting} />
          <Pressable accessibilityRole="button" onPress={onClose} className="items-center mt-2.5">
            <Text className="text-[13px] text-text-faint">Cancel</Text>
          </Pressable>
        </Card>
      </View>
    </Modal>
  );
}
