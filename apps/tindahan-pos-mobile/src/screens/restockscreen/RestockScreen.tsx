import { Text, View } from "react-native";
import { BottomTabBar } from "../../components/BottomTabBar";
import { Card } from "../../components/card";
import { DetailHeader } from "../../components/detailheader";
import { InfoCallout } from "../../components/InfoCallout";
import { ListRow } from "../../components/listrow";
import { MetricCard } from "../../components/MetricCard";
import { ScreenContainer } from "../../components/screencontainer";
import { rowDescription, useRestockScreen } from "./hooks";
import type { RestockScreenProps } from "./types";

/**
 * Restock report (design mockup: mobile-owner-restock.html). "Send the
 * list" opens the native Share sheet with a plain-text order summary --
 * real, working, and generic (not addressed to a named supplier, since
 * mobile doesn't fetch `suppliers` yet -- see lib/inventory.ts's
 * buildRestockRows doc comment for the OUT/CRITICAL/LOW judgment call).
 */
export function RestockScreen({ onBack, activeTab, onChangeTab }: RestockScreenProps) {
  const { rows, outCount, criticalCount, lowCount, handleSendList } = useRestockScreen();

  return (
    <View className="flex-1">
      <ScreenContainer reserveTabBarSpace>
        <DetailHeader
          title="Needs restocking"
          subtitle={`${rows.length} products · most urgent first`}
          onBack={onBack}
          trailingIcon="printer"
          trailingLabel="Print"
          onTrailingPress={() => {}}
        />

        <View className="flex-row gap-2 mb-3.5">
          <MetricCard label="Out" value={String(outCount)} variant="danger" flexBasis="31%" />
          <MetricCard label="Critical" value={String(criticalCount)} variant="warning" flexBasis="31%" />
          <MetricCard label="Low" value={String(lowCount)} flexBasis="31%" />
        </View>

        {rows.length === 0 ? (
          <Text className="text-[13px] text-text-faint text-center py-6">Everything's well stocked.</Text>
        ) : (
          <Card>
            {rows.map((row, index) => (
              <View key={row.productId}>
                <ListRow
                  icon={row.isOut ? "alert-circle" : "box"}
                  tone={row.isOut ? "error" : "warning"}
                  title={row.productName}
                  subtitle={rowDescription(row)}
                  trailing={
                    row.suggestedQuantity !== null ? (
                      <Text className="text-xs font-medium text-text-primary bg-accent rounded-chip px-3 py-1.5 overflow-hidden">
                        Order {row.suggestedQuantity}
                      </Text>
                    ) : undefined
                  }
                />
                {index < rows.length - 1 && <View className="h-px bg-hairline-faint" />}
              </View>
            ))}
          </Card>
        )}

        {rows.length > 0 && (
          <View className="mt-3.5">
            <InfoCallout
              icon="truck"
              title="Send the list"
              description="Opens a message with quantities filled in"
              onPress={handleSendList}
            />
          </View>
        )}
      </ScreenContainer>

      <BottomTabBar active={activeTab} onChange={onChangeTab} />
    </View>
  );
}
