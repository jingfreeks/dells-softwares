import { Text, View } from "react-native";
import { PrimaryButton } from "../../../../components/primarybutton";
import { REVIEW_BENEFITS } from "../../types";

/**
 * The Starter/Growth upsell.
 *
 * Marketing only, exactly as the design says: no Review data is fetched to
 * render this. A store without the entitlement never calls review_summary(),
 * and the server would refuse it if it did — so there is nothing here to hide,
 * because nothing was asked for.
 */
export function ReviewLocked({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <View className="px-1">
      <Text className="text-base font-medium text-text-primary mb-1">Review is available with Growth</Text>
      <Text className="text-[13px] text-text-faint mb-4">
        Get a clearer picture of your store&apos;s performance.
      </Text>

      <View className="mb-5">
        {REVIEW_BENEFITS.map((benefit) => (
          <View key={benefit} className="flex-row items-center gap-2.5 py-1.5">
            {/* The tick is decorative; the benefit reads on its own, so this
                does not depend on the glyph rendering. */}
            <Text className="text-success text-[15px]" accessibilityElementsHidden>
              ✓
            </Text>
            <Text className="text-[13.5px] text-text-secondary flex-1">{benefit}</Text>
          </View>
        ))}
      </View>

      <PrimaryButton label="Upgrade to Growth" onPress={onUpgrade} />
    </View>
  );
}
