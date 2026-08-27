import { Pressable, Text, View } from "react-native";
import { BottomTabBar } from "../../components/bottomtabbar";
import { Card } from "../../components/card";
import { DetailHeader } from "../../components/detailheader";
import { PrimaryButton } from "../../components/primarybutton";
import { ScreenContainer } from "../../components/screencontainer";
import { StackedBar } from "../../components/stackedbar";
import { PESO } from "../../lib/money";
import { colors } from "../../theme/colors";
import { UtangRow } from "./component";
import { SORTS, useUtangScreen } from "./hooks";
import type { UtangScreenProps } from "./types";

/**
 * Utang aging report (design mockup: mobile-owner-utang.html). "Send
 * reminders" opens the native Share sheet with a plain-text summary of
 * overdue customers -- real, generic (per-customer messaging/SMS
 * integration doesn't exist anywhere in either app, see the PR research).
 * The mockup's "paid N days ago" caption for a zero-balance customer
 * needs a payment-history read mobile doesn't have yet (record_credit_payment's
 * ledger, not the `sales` table) -- shown as "No balance" instead of
 * inventing a payment date.
 */
export function UtangScreen({ onBack, activeTab, onChangeTab }: UtangScreenProps) {
  const { sort, setSort, overdueOnly, setOverdueOnly, withBalance, oldestDebtDaysById, aging, overdueCount, rows, handleSendReminders } =
    useUtangScreen();

  return (
    <View className="flex-1">
      <ScreenContainer reserveTabBarSpace>
        <DetailHeader
          title="Utang"
          subtitle={`${PESO.format(aging.total)} across ${withBalance.length} customers`}
          onBack={onBack}
          trailingIcon="search"
          trailingLabel="Search"
          onTrailingPress={() => {}}
        />

        {aging.total > 0 && (
          <Card padding={14} style={{ marginBottom: 14 }}>
            <StackedBar
              segments={[
                { fraction: aging.bucket0to14 / aging.total, color: colors.accent },
                { fraction: aging.bucket15to30 / aging.total, color: "#60A5FA" },
                { fraction: aging.bucketOver30 / aging.total, color: colors.error },
              ]}
            />
            <View className="mt-3">
              <View className="flex-row justify-between py-[3px]">
                <Text className="text-[13px] text-text-dim">0–14 days</Text>
                <Text className="text-[13px] text-text-primary">{PESO.format(aging.bucket0to14)}</Text>
              </View>
              <View className="flex-row justify-between py-[3px]">
                <Text className="text-[13px] text-text-dim">15–30 days</Text>
                <Text className="text-[13px] text-text-primary">{PESO.format(aging.bucket15to30)}</Text>
              </View>
              <View className="flex-row justify-between py-[3px]">
                <Text className="text-[13px] text-error">Over 30 days</Text>
                <Text className="text-[13px] text-error">{PESO.format(aging.bucketOver30)}</Text>
              </View>
            </View>
            {aging.overThirtyPercent > 0 && (
              <Text className="text-xs text-text-faint mt-2.5 leading-4">
                {aging.overThirtyPercent}% is older than a month — that is stock sitting in someone else's kitchen.
              </Text>
            )}
          </Card>
        )}

        <View className="flex-row gap-2 mb-3.5 flex-wrap">
          {SORTS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setSort(option)}
              className={`rounded-chip border px-3 py-[7px] ${
                sort === option ? "bg-accent border-accent" : "bg-panel-strong border-hairline"
              }`}
            >
              <Text className={`text-[12.5px] ${sort === option ? "text-text-primary font-medium" : "text-text-dim"}`}>
                {option}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setOverdueOnly((v) => !v)}
            className={`rounded-chip border px-3 py-[7px] ${
              overdueOnly ? "bg-accent border-accent" : "bg-panel-strong border-hairline"
            }`}
          >
            <Text className={`text-[12.5px] ${overdueOnly ? "text-text-primary font-medium" : "text-text-dim"}`}>
              Overdue · {overdueCount}
            </Text>
          </Pressable>
        </View>

        {rows.length === 0 ? (
          <Text className="text-[13px] text-text-faint text-center py-6">No outstanding utang.</Text>
        ) : (
          <Card>
            {rows.map((customer, index) => (
              <View key={customer.id}>
                <UtangRow customer={customer} days={oldestDebtDaysById.get(customer.id) ?? null} />
                {index < rows.length - 1 && <View className="h-px bg-hairline-faint" />}
              </View>
            ))}
          </Card>
        )}

        {overdueCount > 0 && (
          <View className="mt-3.5">
            <PrimaryButton label={`Send reminders to ${overdueCount} overdue`} onPress={handleSendReminders} />
          </View>
        )}
      </ScreenContainer>

      <BottomTabBar active={activeTab} onChange={onChangeTab} />
    </View>
  );
}
