import { ActivityIndicator, Pressable, Text } from "react-native";
import { colors } from "../../../../../theme/colors";
import { PESO } from "../../../../../lib/money";
import type { PayButtonProps } from "./types";

export function PayButton({ checkingOut, canComplete, onCompleteSale, total, paymentSegmentLabel }: PayButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`bg-accent rounded-control py-3.5 items-center mt-3.5 ${canComplete ? "" : "opacity-40"}`}
      disabled={!canComplete}
      onPress={onCompleteSale}
    >
      {checkingOut ? (
        <ActivityIndicator color={colors.textPrimary} />
      ) : (
        <>
          <Text className="text-base font-medium text-text-primary">Complete sale</Text>
          <Text className="text-[11.5px] text-text-primary opacity-85 mt-0.5">
            {PESO.format(total)} · {paymentSegmentLabel.toLowerCase()}
          </Text>
        </>
      )}
    </Pressable>
  );
}
