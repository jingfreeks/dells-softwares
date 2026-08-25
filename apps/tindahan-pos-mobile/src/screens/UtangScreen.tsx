import { useMemo, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Avatar, type AvatarTone } from "../components/Avatar";
import { BottomTabBar } from "../components/BottomTabBar";
import { Card } from "../components/Card";
import { DetailHeader } from "../components/DetailHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { StackedBar } from "../components/StackedBar";
import { useStoreData } from "../lib/storeData";
import {
  buildDebtAgingSummary,
  computeOldestDebtDays,
  creditUsageVariant,
  isOverdueDebt,
  type CreditUsageVariant,
} from "../lib/customers";
import { PESO } from "../lib/money";
import { colors, radii } from "../theme/colors";
import type { Customer } from "../lib/types";

const SORTS = ["Oldest first", "Largest"] as const;
type Sort = (typeof SORTS)[number];

const TONE_COLOR: Record<AvatarTone, string> = {
  accent: colors.accent,
  danger: colors.error,
  info: colors.accentSoft,
  success: colors.success,
};

function avatarTone(variant: CreditUsageVariant, balance: number): AvatarTone {
  if (balance <= 0) return "success";
  if (variant === "danger" || variant === "warn") return "danger";
  return "info";
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface UtangScreenProps {
  onBack?: () => void;
  activeTab: string;
  onChangeTab: (tab: string) => void;
}

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
  const { customers, sales } = useStoreData();
  const [sort, setSort] = useState<Sort>("Oldest first");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const withBalance = useMemo(() => customers.filter((c) => c.balance > 0), [customers]);

  const oldestDebtDaysById = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const customer of withBalance) {
      map.set(customer.id, computeOldestDebtDays(sales, customer));
    }
    return map;
  }, [withBalance, sales]);

  const aging = useMemo(() => buildDebtAgingSummary(withBalance, oldestDebtDaysById), [withBalance, oldestDebtDaysById]);

  const overdueCount = useMemo(
    () => withBalance.filter((c) => isOverdueDebt(oldestDebtDaysById.get(c.id) ?? null)).length,
    [withBalance, oldestDebtDaysById]
  );

  const rows = useMemo(() => {
    const filtered = overdueOnly
      ? withBalance.filter((c) => isOverdueDebt(oldestDebtDaysById.get(c.id) ?? null))
      : withBalance;
    const sorted = [...filtered].sort((a, b) => {
      if (sort === "Largest") return b.balance - a.balance;
      const aDays = oldestDebtDaysById.get(a.id) ?? -1;
      const bDays = oldestDebtDaysById.get(b.id) ?? -1;
      return (bDays ?? -1) - (aDays ?? -1);
    });
    return sorted;
  }, [withBalance, overdueOnly, sort, oldestDebtDaysById]);

  async function handleSendReminders() {
    const overdue = withBalance.filter((c) => isOverdueDebt(oldestDebtDaysById.get(c.id) ?? null));
    const lines = overdue.map((c) => `${c.name} — ${PESO.format(c.balance)}`);
    await Share.share({
      message: `Utang reminders — ${overdue.length} overdue\n\n${lines.join("\n")}`,
    });
  }

  return (
    <View style={styles.flex}>
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
          <Card padding={14} style={styles.mb14}>
            <StackedBar
              segments={[
                { fraction: aging.bucket0to14 / aging.total, color: colors.accent },
                { fraction: aging.bucket15to30 / aging.total, color: "#60A5FA" },
                { fraction: aging.bucketOver30 / aging.total, color: colors.error },
              ]}
            />
            <View style={styles.mt12}>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>0–14 days</Text>
                <Text style={styles.sumValue}>{PESO.format(aging.bucket0to14)}</Text>
              </View>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>15–30 days</Text>
                <Text style={styles.sumValue}>{PESO.format(aging.bucket15to30)}</Text>
              </View>
              <View style={styles.sumRow}>
                <Text style={[styles.sumLabel, styles.badText]}>Over 30 days</Text>
                <Text style={[styles.sumValue, styles.badText]}>{PESO.format(aging.bucketOver30)}</Text>
              </View>
            </View>
            {aging.overThirtyPercent > 0 && (
              <Text style={styles.note}>
                {aging.overThirtyPercent}% is older than a month — that is stock sitting in someone else's kitchen.
              </Text>
            )}
          </Card>
        )}

        <View style={styles.chipRow}>
          {SORTS.map((option) => (
            <Pressable key={option} onPress={() => setSort(option)} style={[styles.chip, sort === option && styles.chipOn]}>
              <Text style={[styles.chipText, sort === option && styles.chipTextOn]}>{option}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setOverdueOnly((v) => !v)} style={[styles.chip, overdueOnly && styles.chipOn]}>
            <Text style={[styles.chipText, overdueOnly && styles.chipTextOn]}>Overdue · {overdueCount}</Text>
          </Pressable>
        </View>

        {rows.length === 0 ? (
          <Text style={styles.emptyText}>No outstanding utang.</Text>
        ) : (
          <Card>
            {rows.map((customer, index) => (
              <View key={customer.id}>
                <UtangRow customer={customer} days={oldestDebtDaysById.get(customer.id) ?? null} />
                {index < rows.length - 1 && <View style={styles.rowDivider} />}
              </View>
            ))}
          </Card>
        )}

        {overdueCount > 0 && (
          <View style={styles.mt14}>
            <PrimaryButton label={`Send reminders to ${overdueCount} overdue`} onPress={handleSendReminders} />
          </View>
        )}
      </ScreenContainer>

      <BottomTabBar active={activeTab} onChange={onChangeTab} />
    </View>
  );
}

function UtangRow({ customer, days }: { customer: Customer; days: number | null }) {
  const variant = creditUsageVariant(customer, days);
  const tone = avatarTone(variant, customer.balance);
  const overdue = isOverdueDebt(days);
  const description =
    variant === "danger" && days !== null
      ? `${days} days · over limit`
      : overdue && days !== null
        ? `${days} days overdue`
        : days !== null
          ? `${days} days`
          : "";

  return (
    <View style={styles.row}>
      <Avatar initial={initialsOf(customer.name)} size={34} shape="circle" tone={tone} />
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {customer.name}
        </Text>
        <Text style={[styles.rowDetail, (variant === "danger" || overdue) && { color: TONE_COLOR.danger }]}>
          {description}
        </Text>
      </View>
      <Text style={[styles.amount, (variant === "danger" || overdue) && { color: TONE_COLOR.danger }]}>
        {PESO.format(customer.balance)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mb14: { marginBottom: 14 },
  mt12: { marginTop: 12 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  sumLabel: { fontSize: 13, color: colors.textDim },
  sumValue: { fontSize: 13, color: colors.textPrimary },
  badText: { color: colors.error },
  note: { fontSize: 12, color: colors.textFaint, marginTop: 10, lineHeight: 16 },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  chip: {
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.panelStrong,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 12.5, color: colors.textDim },
  chipTextOn: { color: colors.textPrimary, fontWeight: "500" },
  rowDivider: { height: 1, backgroundColor: colors.hairlineFaint },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  rowText: { flex: 1, marginLeft: 12, marginRight: 8 },
  rowName: { fontSize: 13.5, fontWeight: "500", color: colors.textPrimary, marginBottom: 2 },
  rowDetail: { fontSize: 11.5, color: colors.textFaint },
  amount: { fontSize: 13.5, fontWeight: "500", color: colors.textPrimary },
  mt14: { marginTop: 14 },
  emptyText: { fontSize: 13, color: colors.textFaint, textAlign: "center", paddingVertical: 24 },
});
