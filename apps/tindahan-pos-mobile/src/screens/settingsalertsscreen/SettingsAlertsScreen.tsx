import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../components/card";
import { DetailHeader } from "../../components/detailheader";
import { PrimaryButton } from "../../components/primarybutton";
import { ScreenContainer } from "../../components/screencontainer";
import { SmallButton } from "../../components/smallbutton";
import { TextField } from "../../components/textfield";
import { Toggle } from "../../components/toggle";
import { MAX_THRESHOLD_DAYS, MIN_THRESHOLD_DAYS } from "../../lib/onboarding";
import { colors } from "../../theme/colors";
import { useSettingsAlertsScreen } from "./hooks";
import { CHANNELS, type SettingsAlertsScreenProps } from "./types";

const DAYS = Array.from(
  { length: MAX_THRESHOLD_DAYS - MIN_THRESHOLD_DAYS + 1 },
  (_, i) => MIN_THRESHOLD_DAYS + i
);

/** mobile-settings-alerts.html -- what reaches you, when, and how. */
export function SettingsAlertsScreen({ onBack }: SettingsAlertsScreenProps) {
  const s = useSettingsAlertsScreen();
  const percent =
    ((s.thresholdDays - MIN_THRESHOLD_DAYS) / (MAX_THRESHOLD_DAYS - MIN_THRESHOLD_DAYS)) * 100;

  return (
    <ScreenContainer>
      <DetailHeader title="Alerts" subtitle="What reaches you, when, and how" onBack={onBack} />

      <Card padding={14} style={{ marginBottom: 14 }}>
        <Text className="text-[13.5px] font-medium text-text-primary mb-2">Stock</Text>

        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-[13px] text-text-dim">Warn below</Text>
          <Text className="text-[14px] font-medium text-accent">{s.thresholdDays} days of cover</Text>
        </View>
        {/* Same tap-a-day control the onboarding wizard uses for this exact
            setting -- a drag-slider would need a new dependency and is
            fiddlier on a phone than seven tap targets. */}
        <View className="flex-row justify-between mb-2 px-0.5">
          {DAYS.map((day) => (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityLabel={`${day} days of cover`}
              onPress={() => s.setThresholdDays(day)}
              className={`w-[26px] h-[26px] rounded-[13px] border ${
                day <= s.thresholdDays ? "bg-accent border-accent" : "bg-panel-strong border-hairline"
              }`}
            />
          ))}
        </View>
        <View className="h-1.5 rounded-[3px] bg-[rgba(255,255,255,0.08)] overflow-hidden mb-3">
          <View className="h-full rounded-[3px] bg-accent" style={{ width: `${percent}%` }} />
        </View>

        <View className="flex-row items-center justify-between py-2">
          <Text className="text-[13px] text-text-dim flex-1 pr-3">Fast movers warn earlier</Text>
          <Toggle
            value={s.fastMoverBoost}
            onToggle={s.toggleFastMoverBoost}
            accessibilityLabel="Fast movers warn earlier"
          />
        </View>
        <View className="flex-row items-center justify-between py-2">
          <Text className="text-[13px] text-text-dim flex-1 pr-3">Out of stock, straight away</Text>
          <Toggle
            value={s.alerts.warnOutOfStockImmediately}
            onToggle={() => s.toggleAlert("warnOutOfStockImmediately")}
            accessibilityLabel="Out of stock, straight away"
          />
        </View>
      </Card>

      <Card padding={14} style={{ marginBottom: 14 }}>
        <Text className="text-[13.5px] font-medium text-text-primary mb-2">Money</Text>

        <View className="flex-row items-center justify-between py-2">
          <Text className="text-[13px] text-text-dim flex-1 pr-3">Drawer off by more than</Text>
          <View style={{ width: 90 }}>
            <TextField
              accessibilityLabel="Drawer off by more than"
              value={`₱${s.alerts.drawerVarianceThreshold}`}
              onChangeText={(value) => s.setNumericAlert("drawerVarianceThreshold", value)}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View className="flex-row items-center justify-between py-2">
          <Text className="text-[13px] text-text-dim flex-1 pr-3">Utang older than</Text>
          <View style={{ width: 90 }}>
            <TextField
              accessibilityLabel="Utang older than"
              value={`${s.alerts.utangAgingThresholdDays} days`}
              onChangeText={(value) => s.setNumericAlert("utangAgingThresholdDays", value)}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View className="flex-row items-center justify-between py-2">
          <Text className="text-[13px] text-text-dim flex-1 pr-3">E-load float running low</Text>
          <Toggle
            value={s.warnLowEloadFloat}
            onToggle={s.toggleWarnLowEloadFloat}
            accessibilityLabel="E-load float running low"
          />
        </View>
        <View className="flex-row items-center justify-between py-2">
          <Text className="text-[13px] text-text-dim flex-1 pr-3">Any void after payment</Text>
          <Toggle
            value={s.alerts.alertOnVoidAfterPayment}
            onToggle={() => s.toggleAlert("alertOnVoidAfterPayment")}
            accessibilityLabel="Any void after payment"
          />
        </View>
      </Card>

      <Card padding={14} style={{ marginBottom: 14 }}>
        <Text className="text-[13.5px] font-medium text-text-primary mb-2.5">How and when</Text>

        <View className="flex-row gap-2 mb-3">
          {CHANNELS.map((channel) => {
            const on = s.alerts[channel.key];
            return (
              <Pressable
                key={channel.key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={channel.label}
                onPress={() => s.toggleAlert(channel.key)}
                className="flex-1 rounded-xl border px-2 py-2.5"
                style={{
                  backgroundColor: on ? "rgba(76,141,255,0.14)" : colors.panel,
                  borderColor: on ? "rgba(76,141,255,0.40)" : colors.hairline,
                }}
              >
                <Feather name={channel.icon} size={16} color={on ? colors.accent : colors.textFaint} />
                <Text
                  className="text-[12px] mt-1"
                  style={{ color: on ? colors.accent : colors.textDim, fontWeight: on ? "500" : "400" }}
                >
                  {channel.label}
                </Text>
                <Text className="text-[10px]" style={{ color: on ? colors.accentSoft : colors.textFaint }}>
                  {on ? channel.detail : "Off"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row items-center py-2 border-t border-hairline">
          <View className="flex-1 pr-3">
            <Text className="text-[13px] text-text-dim">Daily summary at</Text>
            <Text className="text-[11.5px] text-text-faint">One message instead of many</Text>
          </View>
          <View style={{ width: 96 }}>
            <TextField
              accessibilityLabel="Daily summary at"
              value={s.alerts.dailySummaryTime}
              onChangeText={(value) => s.setTime("dailySummaryTime", value)}
            />
          </View>
        </View>

        <View className="flex-row items-center py-2">
          <View className="flex-1 pr-3">
            <Text className="text-[13px] text-text-dim">Quiet hours</Text>
            <Text className="text-[11.5px] text-text-faint">Nothing except money alerts</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View style={{ width: 68 }}>
              <TextField
                accessibilityLabel="Quiet hours start"
                value={s.alerts.quietHoursStart}
                onChangeText={(value) => s.setTime("quietHoursStart", value)}
              />
            </View>
            <Text className="text-[11.5px] text-text-faint">–</Text>
            <View style={{ width: 68 }}>
              <TextField
                accessibilityLabel="Quiet hours end"
                value={s.alerts.quietHoursEnd}
                onChangeText={(value) => s.setTime("quietHoursEnd", value)}
              />
            </View>
          </View>
        </View>
      </Card>

      {s.saved && !s.dirty && (
        <View className="flex-row items-center gap-1.5 mb-2">
          <Feather name="check-circle" size={14} color={colors.success} />
          <Text className="text-[12.5px]" style={{ color: colors.success }}>
            Alert settings saved.
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
