import { Text, View } from "react-native";
import { SectionHeader } from "../../../../components/sectionheader";
import { PESO } from "../../../../lib/money";
import { monthLabel, type ReviewHistoryMonth } from "../../../../lib/review";

/**
 * Months there is something to review.
 *
 * NO "Reviewed" CHIP. The mobile mockup puts one on every row; Product
 * Decisions §3 rules it out, and rightly — nothing sets it, so it would be the
 * same word on every row forever, implying someone checked when nobody has.
 * The row carries what is true instead: the month, its dates, and what it sold.
 */
export function HistoryList({ months }: { months: ReviewHistoryMonth[] }) {
  return (
    <>
      <SectionHeader title="Review History" />
      <View className="bg-panel border border-hairline rounded-card px-3.5 mb-4">
        {months.length === 0 ? (
          <Text className="text-[13px] text-text-faint py-3">
            A month appears here once the store has recorded sales in it.
          </Text>
        ) : (
          months.map((entry, index) => (
            <View key={entry.month}>
              <View className="flex-row items-center justify-between py-3">
                <View className="flex-1 pr-2">
                  <Text className="text-[13.5px] text-text-primary">{monthLabel(entry.month)}</Text>
                  <Text className="text-[11px] text-text-faint">
                    Monthly Store Review · {PESO.format(entry.salesTotal)}
                  </Text>
                </View>
              </View>
              {index < months.length - 1 && <View className="h-px bg-hairline-faint" />}
            </View>
          ))
        )}
      </View>
    </>
  );
}
