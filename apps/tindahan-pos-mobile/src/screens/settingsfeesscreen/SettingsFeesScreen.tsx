import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../components/card";
import { DetailHeader } from "../../components/detailheader";
import { PrimaryButton } from "../../components/primarybutton";
import { ScreenContainer } from "../../components/screencontainer";
import { SmallButton } from "../../components/smallbutton";
import { TextField } from "../../components/textfield";
import { Toggle } from "../../components/toggle";
import { colors } from "../../theme/colors";
import { BracketTableCard } from "./component/brackettablecard";
import { useSettingsFeesScreen } from "./hooks";
import { GUARDRAIL_ROWS, LIMIT_FIELDS, PRINT_FIELDS, type SettingsFeesScreenProps } from "./types";

/** mobile-settings-fees.html -- what you charge, and what staff can do without you. */
export function SettingsFeesScreen({ onBack }: SettingsFeesScreenProps) {
  const s = useSettingsFeesScreen();

  return (
    <ScreenContainer>
      <DetailHeader
        title="Fees and limits"
        subtitle="What you charge, and what staff can do without you"
        onBack={onBack}
      />

      <BracketTableCard
        table="eload"
        title="E-load fee"
        brackets={s.brackets.eload}
        onFeeChange={(i, v) => s.setBracketFee("eload", i, v)}
        onMaxChange={(i, v) => s.setBracketMax("eload", i, v)}
        onAdd={() => s.addBracket("eload")}
        onRemove={(i) => s.removeBracket("eload", i)}
      />

      <BracketTableCard
        table="cashIn"
        title="Cash-in fee"
        brackets={s.brackets.cashIn}
        onFeeChange={(i, v) => s.setBracketFee("cashIn", i, v)}
        onMaxChange={(i, v) => s.setBracketMax("cashIn", i, v)}
        onAdd={() => s.addBracket("cashIn")}
        onRemove={(i) => s.removeBracket("cashIn", i)}
      />

      <BracketTableCard
        table="cashOut"
        title="Cash-out fee"
        brackets={s.brackets.cashOut}
        onFeeChange={(i, v) => s.setBracketFee("cashOut", i, v)}
        onMaxChange={(i, v) => s.setBracketMax("cashOut", i, v)}
        onAdd={() => s.addBracket("cashOut")}
        onRemove={(i) => s.removeBracket("cashOut", i)}
      />

      <Card padding={14} style={{ marginBottom: 14 }}>
        <Text className="text-[13.5px] font-medium text-text-primary mb-2.5">Print and photocopy</Text>
        <View className="flex-row flex-wrap gap-2.5">
          {PRINT_FIELDS.map((field) => (
            <View key={field.key} style={{ width: "47%" }}>
              <TextField
                accessibilityLabel={field.label}
                label={field.label}
                value={field.currency ? `₱${s.limits[field.key]}` : `${s.limits[field.key]} pages`}
                onChangeText={(value) => s.setLimitValue(field.key, value)}
                keyboardType="number-pad"
              />
            </View>
          ))}
        </View>
      </Card>

      <Card padding={14} style={{ marginBottom: 14 }}>
        <Text className="text-[13.5px] font-medium text-text-primary mb-2.5">Cash and credit limits</Text>
        <View className="flex-row gap-2.5 mb-2.5">
          {LIMIT_FIELDS.map((field) => (
            <View key={field.key} className="flex-1">
              <TextField
                accessibilityLabel={field.label}
                label={field.label}
                value={`₱${s.limits[field.key]}`}
                onChangeText={(value) => s.setLimitValue(field.key, value)}
                keyboardType="number-pad"
              />
            </View>
          ))}
        </View>
        <TextField
          accessibilityLabel="Cashier cash-out cap"
          label="Cashier cash-out cap"
          value={`₱${s.limits.cashierCashOutCap}`}
          onChangeText={(value) => s.setLimitValue("cashierCashOutCap", value)}
          keyboardType="number-pad"
        />

        <View className="h-2.5" />
        {GUARDRAIL_ROWS.map((row) => (
          <View key={row.key} className="flex-row items-center justify-between py-2">
            <Text className="text-[13px] text-text-dim flex-1 pr-3">{row.label}</Text>
            <Toggle
              value={s.limits[row.key]}
              onToggle={() => s.toggleLimit(row.key)}
              accessibilityLabel={row.label}
            />
          </View>
        ))}
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
            Fees and limits saved.
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
