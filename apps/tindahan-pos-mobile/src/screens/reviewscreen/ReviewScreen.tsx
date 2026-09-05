import { Text, View } from "react-native";
import { BottomTabBar } from "../../components/bottomtabbar";
import { Card } from "../../components/card";
import { DetailHeader } from "../../components/detailheader";
import { MetricCard } from "../../components/metriccard";
import { PrimaryButton } from "../../components/primarybutton";
import { ScreenContainer } from "../../components/screencontainer";
import { PESO } from "../../lib/money";
import { ReviewLocked } from "./component";
import { useReviewScreen } from "./hooks";
import type { ReviewScreenProps } from "./types";

function asPercent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/**
 * The line under Estimated Profit, in every state.
 *
 * sale_items never captured a cost snapshot, so the figure is computed at
 * TODAY's cost — estimated even at full coverage. The web app learned this the
 * hard way: a bare margin reads as exact, which is what the product decisions
 * forbid. Zero coverage shows no figure at all rather than a misleading ₱0.00.
 */
function profitCaption(summary: { estimatedProfit: number; profitBasisShare: number; salesTotal: number }): string {
  if (summary.profitBasisShare <= 0) return "No product costs recorded yet";
  if (summary.profitBasisShare < 1) {
    return `Est. from current costs · ${asPercent(summary.profitBasisShare)} of sales have one`;
  }
  return summary.salesTotal > 0
    ? `${asPercent(summary.estimatedProfit / summary.salesTotal)} margin · estimated`
    : "Estimated from current costs";
}

/**
 * Review, mobile.
 *
 * Single column, one-handed scrolling, inside the standard shell with the
 * bottom tab bar — the mobile design is explicit that it is not a shrunken
 * desktop dashboard.
 */
export function ReviewScreen({ activeTab, onChangeTab, onBack, onUpgrade }: ReviewScreenProps) {
  const { state, summary, retry } = useReviewScreen();

  return (
    <ScreenContainer>
      <DetailHeader title="Review" subtitle="See what needs your attention" onBack={onBack} />

      {state === "loading" && (
        <Card>
          <Text className="text-[13px] text-text-faint">Loading…</Text>
        </Card>
      )}

      {state === "locked" && (
        <Card>
          <ReviewLocked onUpgrade={onUpgrade} />
        </Card>
      )}

      {state === "error" && (
        <Card>
          {/* Deliberately plain. Whatever the server said stays out of it: a
              shop owner cannot act on a Postgres message. */}
          <Text className="text-base font-medium text-text-primary mb-1">
            We couldn&apos;t load your review
          </Text>
          <Text className="text-[13px] text-text-faint mb-4">Please try again.</Text>
          <PrimaryButton label="Try again" onPress={() => void retry()} />
        </Card>
      )}

      {state === "ready" && summary && (
        // Four metrics, not the design's five. EXPENSES is absent because this
        // schema has no expenses table and review_summary() does not return the
        // key — the same call the web app made.
        <View className="flex-row flex-wrap gap-2.5">
          <MetricCard
            label="Sales"
            value={PESO.format(summary.salesTotal)}
            caption={`${summary.transactionCount} sales`}
          />
          <MetricCard
            label="Est. profit"
            value={summary.profitBasisShare > 0 ? PESO.format(summary.estimatedProfit) : "—"}
            caption={profitCaption(summary)}
            variant={summary.profitBasisShare < 1 ? "warning" : "default"}
          />
          <MetricCard
            label="Utang"
            value={PESO.format(summary.utangOutstanding)}
            caption={summary.overdueCustomerCount > 0 ? `${summary.overdueCustomerCount} overdue` : undefined}
            variant={summary.overdueCustomerCount > 0 ? "warning" : "default"}
          />
          <MetricCard
            label="Inventory"
            value={PESO.format(summary.inventoryValue)}
            caption={summary.lowStockCount > 0 ? `${summary.lowStockCount} low stock` : undefined}
            variant={summary.lowStockCount > 0 ? "warning" : "default"}
          />
        </View>
      )}

      <BottomTabBar active={activeTab} onChange={onChangeTab} />
    </ScreenContainer>
  );
}
