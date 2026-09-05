import { Text, View } from "react-native";
import { SectionHeader } from "../../../../components/sectionheader";
import { StackedBar } from "../../../../components/stackedbar";

interface InventoryHealthProps {
  productCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  slowMovingCount: number;
}

const COLORS = {
  healthy: "#4ADE80",
  low: "#FBBF24",
  critical: "#F87171",
  slow: "#94A3B8",
};

/**
 * Stock health as one bar plus a sentence.
 *
 * The mobile design summarises this as "82% healthy · 12 products need
 * restocking soon" rather than repeating the desktop's four-column legend --
 * a phone has room for the conclusion, not the table.
 *
 * "Critical" is out-of-stock, not a third threshold: the schema has one
 * per-product low-stock threshold and a zero, so a middle band would be a rule
 * the rest of the app does not apply.
 */
export function InventoryHealth({
  productCount,
  lowStockCount,
  outOfStockCount,
  slowMovingCount,
}: InventoryHealthProps) {
  // A product can be both slow-moving and low. Slow-moving yields, so nothing
  // is counted twice and the shares stay honest.
  const slow = Math.max(0, Math.min(slowMovingCount, productCount - lowStockCount - outOfStockCount));
  const healthy = Math.max(0, productCount - lowStockCount - outOfStockCount - slow);
  const share = (count: number) => (productCount > 0 ? count / productCount : 0);
  const needRestocking = lowStockCount + outOfStockCount;

  return (
    <>
      <SectionHeader title="Inventory Review" />
      <View className="bg-panel border border-hairline rounded-card p-3.5 mb-4">
        {productCount === 0 ? (
          <Text className="text-[13px] text-text-faint">No products yet.</Text>
        ) : (
          <>
            <View className="mb-3">
              <StackedBar
                segments={[
                  { fraction: share(healthy), color: COLORS.healthy },
                  { fraction: share(lowStockCount), color: COLORS.low },
                  { fraction: share(outOfStockCount), color: COLORS.critical },
                  { fraction: share(slow), color: COLORS.slow },
                ]}
              />
            </View>
            <Text className="text-[13px] text-text-secondary">
              {Math.round(share(healthy) * 100)}% healthy
              {needRestocking > 0 ? ` · ${needRestocking} products need restocking soon` : ""}
            </Text>
          </>
        )}
      </View>
    </>
  );
}
