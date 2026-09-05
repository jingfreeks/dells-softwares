import { Text, View } from "react-native";
import { SectionHeader } from "../../../../components/sectionheader";
import { PESO } from "../../../../lib/money";
import type { ReviewOverdueCustomer } from "../../../../lib/review";

interface UtangReviewProps {
  outstanding: number;
  overdue: number;
  customersWithBalance: number;
  overdueCustomers: ReviewOverdueCustomer[];
}

/**
 * Utang, which for a sari-sari store is the number that keeps people awake.
 *
 * Names appear only for customers past the store's own threshold, and the
 * server caps the list at five — this is a prompt to go and ask, not a ledger.
 */
export function UtangReview({
  outstanding,
  overdue,
  customersWithBalance,
  overdueCustomers,
}: UtangReviewProps) {
  return (
    <>
      <SectionHeader title="Customer & Utang" />
      <View className="bg-panel border border-hairline rounded-card p-3.5 mb-4">
        <View className="flex-row justify-between mb-3.5">
          <View className="flex-1">
            <Text className="text-[10px] font-medium tracking-[0.8px] uppercase text-text-faint mb-1">
              Outstanding
            </Text>
            <Text className="text-[15px] text-text-primary">{PESO.format(outstanding)}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-medium tracking-[0.8px] uppercase text-text-faint mb-1">
              Overdue
            </Text>
            <Text className={overdue > 0 ? "text-[15px] text-danger" : "text-[15px] text-text-primary"}>
              {PESO.format(overdue)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-medium tracking-[0.8px] uppercase text-text-faint mb-1">
              With balance
            </Text>
            <Text className="text-[15px] text-text-primary">{customersWithBalance}</Text>
          </View>
        </View>

        {overdueCustomers.length > 0 ? (
          <>
            <Text className="text-[11px] font-medium tracking-[0.8px] uppercase text-text-faint mb-1.5">
              Needs attention
            </Text>
            {overdueCustomers.map((customer) => (
              <View key={customer.id} className="flex-row items-center justify-between py-1.5">
                <View className="flex-1 pr-2">
                  <Text className="text-[13px] text-text-secondary" numberOfLines={1}>
                    {customer.name}
                  </Text>
                  <Text className="text-[11px] text-danger">{customer.daysOverdue} days overdue</Text>
                </View>
                <Text className="text-[13px] text-text-primary">{PESO.format(customer.balance)}</Text>
              </View>
            ))}
          </>
        ) : (
          <Text className="text-[13px] text-text-faint">Nobody is past your overdue limit.</Text>
        )}
      </View>
    </>
  );
}
