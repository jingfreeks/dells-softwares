import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ScreenContainer } from "../../components/screencontainer";
import { Card } from "../../components/card";
import { colors } from "../../theme/colors";
import { DeviceRow, PairingCodeCard, UnpairModal } from "./component";
import { useSetupRegisterScreen } from "./hooks";
import type { SetupRegisterScreenProps } from "./types";

/** Owner-side "Set up a register" (mobile-pair-device.html) -- generate a code, list/unpair devices. */
export function SetupRegisterScreen({ onBack }: SetupRegisterScreenProps) {
  const {
    devices,
    loadingDevices,
    loadError,
    code,
    msLeft,
    generating,
    generateError,
    generateCode,
    unpairTarget,
    openUnpairModal,
    closeUnpairModal,
    onDeviceUnpaired,
  } = useSetupRegisterScreen();

  return (
    <ScreenContainer>
      <View className="flex-row items-center gap-3 mb-4">
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} className="w-9 h-9 rounded-button bg-panel-strong border border-hairline items-center justify-center">
          <Feather name="arrow-left" size={18} color={colors.textPrimary} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-medium text-text-primary">Set up a register</Text>
          <Text className="text-[11.5px] text-text-faint mt-0.5">For a tablet or phone at the counter</Text>
        </View>
      </View>

      <PairingCodeCard code={code} msLeft={msLeft} generating={generating} generateError={generateError} onGenerate={generateCode} />

      <Card padding={14} style={{ marginTop: 16, marginBottom: 16 }}>
        <Text className="text-[13px] font-medium text-text-primary mb-1">On the counter device</Text>
        <Text className="text-[12.5px] text-text-dim leading-[18px]">
          Open Tindahan POS, tap <Text className="text-text-dim font-semibold">Set up this device as a register</Text>, then type the
          code above. It confirms the store before pairing.
        </Text>
      </Card>

      <Text className="text-[15px] font-medium text-text-primary mb-2.5">Paired devices</Text>
      {loadingDevices ? (
        <Text className="text-[13px] text-text-faint">Loading…</Text>
      ) : loadError ? (
        <Text accessibilityRole="alert" className="text-error text-[12.5px] mt-2 mb-1.5">
          {loadError}
        </Text>
      ) : devices.length === 0 ? (
        <Text className="text-[13px] text-text-faint">No devices paired yet.</Text>
      ) : (
        <Card padding={0}>
          {devices.map((device, i) => (
            <DeviceRow key={device.id} device={device} isLast={i === devices.length - 1} onUnpair={openUnpairModal} />
          ))}
        </Card>
      )}
      <Text className="text-[11px] text-text-faint mt-3 mb-6 leading-4">
        Only an owner PIN can unpair a device. The owner&apos;s session never touches the counter device — the code
        is the only thing that crosses over.
      </Text>

      {unpairTarget && <UnpairModal device={unpairTarget} onClose={closeUnpairModal} onUnpaired={onDeviceUnpaired} />}
    </ScreenContainer>
  );
}
