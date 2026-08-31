import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth";
import { Card } from "../../components/card";
import { DetailHeader } from "../../components/detailheader";
import { PrimaryButton } from "../../components/primarybutton";
import { ScreenContainer } from "../../components/screencontainer";
import { SmallButton } from "../../components/smallbutton";
import { TextField } from "../../components/textfield";
import { Toggle } from "../../components/toggle";
import { printGuardrails } from "../../lib/appMode";
import { colors } from "../../theme/colors";
import { ReceiptPreview } from "./component/receiptpreview";
import { useSettingsReceiptsScreen } from "./hooks";
import { DELIVERY_ROWS, INCLUDE_CHIPS, type SettingsReceiptsScreenProps } from "./types";

/** mobile-settings-receipts.html -- what the customer gets after a sale. */
export function SettingsReceiptsScreen({ onBack }: SettingsReceiptsScreenProps) {
  const s = useSettingsReceiptsScreen();
  const guard = printGuardrails();
  const { store } = useAuth();

  return (
    <ScreenContainer>
      <DetailHeader title="Receipts" subtitle="What the customer gets after a sale" onBack={onBack} />

      <Card padding={14} style={{ marginBottom: 14 }}>
        <Text className="text-[13.5px] font-medium text-text-primary mb-2">How to send it</Text>
        {DELIVERY_ROWS.map((row) => (
          <View key={row.key} className="flex-row items-center justify-between py-2">
            <Text className="text-[13px] text-text-secondary flex-1 pr-3">{row.label}</Text>
            <Toggle
              value={s.settings[row.key]}
              onToggle={() => s.toggle(row.key)}
              accessibilityLabel={row.label}
            />
          </View>
        ))}
        <Text className="text-[11.5px] text-text-faint mt-1.5">
          Most sari-sari customers don&apos;t want paper. Ask, don&apos;t assume.
        </Text>
      </Card>

      <Card padding={14} style={{ marginBottom: 14 }}>
        <Text className="text-[13.5px] font-medium text-text-primary mb-2.5">What to include</Text>
        <View className="flex-row flex-wrap gap-2">
          {INCLUDE_CHIPS.map((chip) => {
            // TIN and permit number are registration identifiers. While
            // the app is unaccredited, letting a tester switch them on
            // would be letting them dress a test document up as an
            // official one, so the chip is locked rather than hidden --
            // the setting still exists, it just cannot be used yet.
            const locked = chip.key === "includeTinAndPermit" && !guard.allowTaxIdentifiers;
            const on = s.settings[chip.key] && !locked;
            return (
              <Pressable
                key={chip.key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on, disabled: locked }}
                accessibilityLabel={locked ? `${chip.label} (unavailable in test mode)` : chip.label}
                onPress={() => !locked && s.toggle(chip.key)}
                disabled={locked}
                className="h-8 px-3 flex-row items-center rounded-full border"
                style={{
                  backgroundColor: on ? "rgba(76,141,255,0.14)" : colors.panelStrong,
                  borderColor: on ? "rgba(76,141,255,0.40)" : colors.hairline,
                  opacity: locked ? 0.45 : 1,
                }}
              >
                {on && <Feather name="check" size={12} color={colors.accent} style={{ marginRight: 5 }} />}
                {locked && <Feather name="lock" size={11} color={colors.textFaint} style={{ marginRight: 5 }} />}
                <Text className="text-[12.5px]" style={{ color: on ? colors.accent : colors.textDim }}>
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {guard.testMode && (
          <Text className="text-[11.5px] text-text-faint mt-2">
            TIN and permit number stay off while the app is in test mode. Order slips printed now are not
            official BIR receipts.
          </Text>
        )}
      </Card>

      <Card padding={14} style={{ marginBottom: 14 }}>
        <TextField
          accessibilityLabel="Footer message"
          label="Footer message"
          value={s.settings.footerMessage}
          onChangeText={s.setFooterMessage}
        />
        <Text className="text-[11.5px] text-text-faint mt-1.5">{s.footerCharsLeft} characters left</Text>
      </Card>

      <Card padding={14} style={{ marginBottom: 14 }}>
        <View className="flex-row items-center">
          <View className="flex-1 pr-3">
            <Text className="text-[13px] text-text-secondary">Receipt numbering</Text>
            <Text className="text-[11.5px] text-text-faint">
              {s.nextReceiptNumber ? `Next: ${s.nextReceiptNumber}` : "Loading…"}
            </Text>
          </View>
        </View>
        <Text className="text-[11.5px] text-text-faint mt-2">
          Set automatically on every sale. It can&apos;t be edited here -- two sales must never share a number.
        </Text>
      </Card>

      <Text className="text-[11px] font-medium text-text-faint mb-2" style={{ letterSpacing: 0.5 }}>
        PREVIEW
      </Text>
      <View className="mb-4">
        <ReceiptPreview
          storeName={s.storeName}
          store={store}
          includeLogo={s.settings.includeLogo}
          includeTinAndPermit={s.settings.includeTinAndPermit}
          includeCashierName={s.settings.includeCashierName}
          footerMessage={s.settings.footerMessage}
        />
      </View>

      {s.saved && !s.dirty && (
        <View className="flex-row items-center gap-1.5 mb-2">
          <Feather name="check-circle" size={14} color={colors.success} />
          <Text className="text-[12.5px]" style={{ color: colors.success }}>
            Receipt settings saved.
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
