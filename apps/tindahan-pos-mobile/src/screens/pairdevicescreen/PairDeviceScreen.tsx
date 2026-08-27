import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ScreenContainer } from "../../components/ScreenContainer";
import { Card } from "../../components/card";
import { PrimaryButton } from "../../components/primarybutton";
import { TextField } from "../../components/TextField";
import { colors } from "../../theme/colors";
import { usePairDeviceScreen } from "./hooks";
import type { PairDeviceScreenProps } from "./types";

/** "Set up this device as a register" -- the counter-device side of pairing (mobile-pair-device.html's own instructions). */
export function PairDeviceScreen({ onBack }: PairDeviceScreenProps) {
  const { code, handleCodeChange, deviceName, setDeviceName, submitting, error, handleSubmit } =
    usePairDeviceScreen();

  return (
    <ScreenContainer>
      <View className="flex-row items-center gap-3 mb-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          className="w-9 h-9 rounded-button bg-panel-strong border border-hairline items-center justify-center"
        >
          <Feather name="arrow-left" size={18} color={colors.textPrimary} />
        </Pressable>
        <Text className="flex-1 text-base font-medium text-text-primary">Set up this device as a register</Text>
      </View>
      <Text className="text-[13px] text-text-dim mb-4 leading-[19px]">
        Ask the owner to open Settings on their phone and generate a pairing code, then type it here.
      </Text>

      <Card padding={16} style={{ marginBottom: 16 }}>
        <TextField
          accessibilityLabel="Pairing code"
          label="Pairing code"
          value={code}
          onChangeText={handleCodeChange}
          autoCapitalize="characters"
          maxLength={6}
          placeholder="T4K9XY"
        />
        <TextField
          accessibilityLabel="Device name"
          label="Name this device"
          value={deviceName}
          onChangeText={setDeviceName}
          placeholder="Counter tablet"
        />
      </Card>

      {error && (
        <Text accessibilityRole="alert" className="text-[13px] text-error mb-2.5">
          {error}
        </Text>
      )}

      <PrimaryButton label="Pair this device" onPress={handleSubmit} loading={submitting} />
    </ScreenContainer>
  );
}
