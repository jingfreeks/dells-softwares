import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../../../../components/Card";
import { PrimaryButton } from "../../../../../components/PrimaryButton";
import { STARTER_CATALOG } from "../../../../../lib/onboarding";
import { colors } from "../../../../../theme/colors";
import type { StarterListCardProps } from "./types";

export function StarterListCard({
  enabledCategoryKeys,
  onToggleCategory,
  starterItemsToAddCount,
  importingStarter,
  starterError,
  onImportStarterCatalog,
}: StarterListCardProps) {
  return (
    <Card padding={15} style={{ marginBottom: 14, backgroundColor: "rgba(76, 141, 255, 0.10)", borderColor: "rgba(76, 141, 255, 0.42)" }}>
      <View className="flex-row gap-[11px] items-start mb-3">
        <View className="w-[34px] h-[34px] rounded-[11px] bg-panel-strong items-center justify-center">
          <Feather name="star" size={16} color={colors.accentSoft} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-sm font-medium text-text-primary">Starter list</Text>
            <View className="bg-accent rounded-pill px-2 py-0.5">
              <Text className="text-[10px] font-medium text-text-primary">Fastest</Text>
            </View>
          </View>
          <Text className="text-[12.5px] leading-[18px] text-text-dim mt-[3px]">
            120 common sari-sari items with typical prices filled in. Untick what you don&apos;t carry.
          </Text>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2 mb-[13px]">
        {STARTER_CATALOG.map((category) => {
          const enabled = enabledCategoryKeys.has(category.key);
          return (
            <Pressable
              key={category.key}
              accessibilityRole="button"
              accessibilityState={{ selected: enabled }}
              onPress={() => onToggleCategory(category.key)}
              className={`flex-row items-center gap-[5px] h-8 px-3 rounded-chip border ${
                enabled ? "bg-[rgba(76,141,255,0.18)] border-[rgba(76,141,255,0.35)]" : "bg-panel-strong border-hairline"
              }`}
            >
              {enabled && <Feather name="check" size={12} color={colors.accentSoft} />}
              <Text className={`text-xs ${enabled ? "text-accent-soft font-medium" : "text-text-dim"}`}>
                {category.label} · {category.items.length}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton
        label={`Add ${starterItemsToAddCount} items`}
        onPress={onImportStarterCatalog}
        loading={importingStarter}
        disabled={starterItemsToAddCount === 0}
      />
      {starterError && (
        <Text accessibilityRole="alert" className="text-error text-xs mt-2">
          {starterError}
        </Text>
      )}
    </Card>
  );
}
