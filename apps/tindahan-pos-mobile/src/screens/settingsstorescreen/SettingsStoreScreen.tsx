import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Avatar } from "../../components/avatar";
import { Card } from "../../components/card";
import { DetailHeader } from "../../components/detailheader";
import { PrimaryButton } from "../../components/primarybutton";
import { ScreenContainer } from "../../components/screencontainer";
import { SmallButton } from "../../components/smallbutton";
import { TextField } from "../../components/textfield";
import { Toggle } from "../../components/toggle";
import { colors } from "../../theme/colors";
import { useSettingsStoreScreen } from "./hooks";
import type { SettingsStoreScreenProps } from "./types";

/** mobile-settings-store.html -- what appears on receipts and reports. */
export function SettingsStoreScreen({ onBack }: SettingsStoreScreenProps) {
  const s = useSettingsStoreScreen();

  return (
    <ScreenContainer>
      <DetailHeader title="Store details" subtitle="Appears on receipts and reports" onBack={onBack} />

      <Card padding={14} style={{ marginBottom: 14 }}>
        <View className="flex-row items-center gap-3 mb-3.5">
          <Avatar initial={s.initials} size={48} uri={s.photoUri} />
          <View className="flex-1">
            <Pressable accessibilityRole="button" onPress={s.onPickPhoto}>
              <Text className="text-[13px] text-accent">Change logo</Text>
            </Pressable>
            <Text className="text-[11.5px] text-text-faint mt-1.5">
              Printed at the top of every receipt
            </Text>
          </View>
        </View>
        {s.photoError && (
          <Text accessibilityRole="alert" className="text-error text-[12.5px] mb-2">
            {s.photoError}
          </Text>
        )}

        <TextField accessibilityLabel="Store name" label="Store name" value={s.name} onChangeText={s.setName} />
        <View className="h-2.5" />
        <TextField
          accessibilityLabel="Contact number"
          label="Contact number"
          value={s.contactNumber}
          onChangeText={s.setContactNumber}
          keyboardType="phone-pad"
        />
        <View className="h-2.5" />
        <TextField accessibilityLabel="Address" label="Address" value={s.address} onChangeText={s.setAddress} />
        <View className="h-2.5" />
        <View className="flex-row gap-2.5">
          <View className="flex-1">
            <TextField accessibilityLabel="City" label="City" value={s.city} onChangeText={s.setCity} />
          </View>
          <View className="flex-1">
            <TextField accessibilityLabel="Currency" label="Currency" value="₱ PHP" editable={false} />
          </View>
        </View>
      </Card>

      <Card padding={14} style={{ marginBottom: 14 }}>
        <Text className="text-[13.5px] font-medium text-text-primary mb-2.5">Opening hours</Text>
        <View className="flex-row items-center gap-2.5">
          <View className="flex-1">
            <TextField
              accessibilityLabel="Opens at"
              value={s.openTime}
              onChangeText={s.setOpenTime}
              placeholder="06:00"
            />
          </View>
          <Text className="text-[11.5px] text-text-faint">to</Text>
          <View className="flex-1">
            <TextField
              accessibilityLabel="Closes at"
              value={s.closeTime}
              onChangeText={s.setCloseTime}
              placeholder="21:00"
            />
          </View>
        </View>
        <Text className="text-[11.5px] text-text-faint mt-2.5">
          Used to work out &quot;sells per day&quot; for stock alerts.
        </Text>
      </Card>

      <Card padding={14} style={{ marginBottom: 14 }}>
        <View className="flex-row items-center pb-2.5">
          <View className="flex-1 pr-3">
            <Text className="text-[13px] text-text-secondary">Registered with BIR</Text>
            <Text className="text-[11.5px] text-text-faint">Turn on if you issue official receipts</Text>
          </View>
          <Toggle
            value={s.birRegistered}
            onToggle={s.toggleBirRegistered}
            accessibilityLabel="Registered with BIR"
          />
        </View>

        <View className="h-px bg-hairline mb-2.5" />

        <View className="flex-row gap-2.5">
          <View className="flex-1">
            <TextField accessibilityLabel="TIN" label="TIN" value={s.tin} onChangeText={s.setTin} />
          </View>
          <View className="flex-1">
            <TextField
              accessibilityLabel="Permit no."
              label="Permit no."
              value={s.businessPermitNo}
              onChangeText={s.setBusinessPermitNo}
            />
          </View>
        </View>
        <Text className="text-[11.5px] text-text-faint mt-2.5">
          Printed on receipts. This app doesn&apos;t verify current BIR requirements.
        </Text>
      </Card>

      {s.error && (
        <Text accessibilityRole="alert" className="text-error text-[12.5px] mb-2">
          {s.error}
        </Text>
      )}
      {s.saved && !s.dirty && (
        <View className="flex-row items-center gap-1.5 mb-2">
          <Feather name="check-circle" size={14} color={colors.success} />
          <Text className="text-[12.5px]" style={{ color: colors.success }}>
            Store details saved.
          </Text>
        </View>
      )}

      <View className="flex-row gap-2.5 mb-6">
        <View className="flex-1">
          <PrimaryButton label="Save changes" onPress={s.onSave} loading={s.saving} disabled={!s.dirty || s.saving} />
        </View>
        <SmallButton label="Discard" onPress={s.onDiscard} disabled={!s.dirty || s.saving} height={48} />
      </View>
    </ScreenContainer>
  );
}
