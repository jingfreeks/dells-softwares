import { Text, View } from "react-native";
import { ActionPill } from "../../../../components/actionpill";
import { ListRow } from "../../../../components/listrow";
import { SectionHeader } from "../../../../components/sectionheader";
import type { ReviewSummary } from "../../../../lib/review";
import { PESO } from "../../../../lib/money";

interface AttentionListProps {
  summary: ReviewSummary;
  onViewLowStock: () => void;
  onViewOverdue: () => void;
  onViewSlowMoving: () => void;
}

interface Row {
  key: string;
  icon: "alert-circle" | "box" | "book" | "check-circle";
  tone: "error" | "warning" | undefined;
  title: string;
  subtitle: string;
  action?: { label: string; onPress: () => void };
}

/**
 * What needs attention, built only from what is true.
 *
 * Every row is conditional: a store with full shelves and nobody overdue sees
 * the good-news row and nothing else. Padding the list with "0 products are
 * low on stock" would be noise, and this section is meant to be read in a
 * second on a phone held in one hand.
 */
export function AttentionList({
  summary,
  onViewLowStock,
  onViewOverdue,
  onViewSlowMoving,
}: AttentionListProps) {
  const rows: Row[] = [];

  if (summary.lowStockCount > 0) {
    rows.push({
      key: "low",
      icon: "box",
      tone: "warning",
      title: `${summary.lowStockCount} products are low on stock`,
      subtitle: "Restock before they run out",
      action: { label: "View", onPress: onViewLowStock },
    });
  }

  if (summary.overdueCustomerCount > 0) {
    rows.push({
      key: "overdue",
      icon: "book",
      tone: "error",
      title: `${summary.overdueCustomerCount} customers have overdue utang`,
      subtitle: `Oldest balance: ${summary.oldestOverdueDays} days`,
      action: { label: "View", onPress: onViewOverdue },
    });
  }

  if (summary.slowMovingCount > 0) {
    rows.push({
      key: "slow",
      icon: "box",
      tone: "warning",
      title: `${summary.slowMovingCount} products have not sold recently`,
      subtitle: "Review your slow-moving stock",
      action: { label: "View", onPress: onViewSlowMoving },
    });
  }

  // Three states, not two. An uncounted drawer has nothing to be off BY, and
  // reporting it as balanced would turn "nobody counted" into "no action
  // needed" -- which is the opposite of true.
  if (summary.shiftsClosed === 0) {
    rows.push({
      key: "shifts",
      icon: "alert-circle",
      tone: "warning",
      title: "No shifts were counted",
      subtitle: "Count the drawer at the end of a shift",
    });
  } else if (summary.shiftsOff > 0) {
    rows.push({
      key: "shifts",
      icon: "alert-circle",
      tone: "error",
      title: `${summary.shiftsOff} of ${summary.shiftsClosed} shifts off by more than your limit`,
      subtitle: PESO.format(summary.shiftsOffTotal),
    });
  } else {
    rows.push({
      key: "shifts",
      icon: "check-circle",
      tone: undefined,
      title: "Cashier shifts are balanced",
      subtitle: "No action needed",
    });
  }

  const needing = rows.filter((r) => r.tone !== undefined).length;

  return (
    <>
      <SectionHeader title="What needs your attention?" />
      {needing > 0 && (
        <Text className="text-[11px] text-text-faint -mt-2 mb-2">{needing} items</Text>
      )}
      <View className="bg-panel border border-hairline rounded-card px-3.5 mb-4">
        {rows.map((row, index) => (
          <View key={row.key}>
            <ListRow
              icon={row.icon}
              tone={row.tone}
              title={row.title}
              subtitle={row.subtitle}
              trailing={
                row.action ? <ActionPill label={row.action.label} onPress={row.action.onPress} /> : undefined
              }
            />
            {index < rows.length - 1 && <View className="h-px bg-hairline-faint" />}
          </View>
        ))}
      </View>
    </>
  );
}
