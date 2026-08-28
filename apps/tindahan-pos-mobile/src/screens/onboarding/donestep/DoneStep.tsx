import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../../components/card";
import { PrimaryButton } from "../../../components/primarybutton";
import { colors } from "../../../theme/colors";
import { PESO } from "../../../lib/money";
import { SummaryRow } from "./component";
import type { DoneStepProps } from "./types";

/** Onboarding done screen (mobile-onboarding-done.html). */
export function DoneStep({
  ownerName,
  storeName,
  openTime,
  closeTime,
  productsAdded,
  thresholdDays,
  startingFloat,
  finishing,
  finishError,
  onFinish,
}: DoneStepProps) {
  return (
    <View>
      <View className="flex-row items-center gap-1.5 self-start bg-[rgba(74,222,128,0.12)] rounded-pill px-2.5 py-[5px] mt-[30px] mb-4">
        <Feather name="check" size={12} color={colors.success} />
        <Text className="text-xs text-success font-medium">Setup complete</Text>
      </View>
      <Text className="text-2xl font-medium leading-[30px] text-text-strong mb-2.5">
        The register is open, {ownerName || "there"}.
      </Text>
      <Text className="text-sm leading-[22px] text-text-dim mb-[18px]">
        {productsAdded} product{productsAdded === 1 ? "" : "s"} loaded, alerts set at {thresholdDays} days of cover, and{" "}
        {PESO.format(startingFloat)} counted into the drawer. Ring up your first sale whenever you&apos;re ready.
      </Text>

      <Card padding={14}>
        <Text className="text-[13.5px] font-medium text-text-primary mb-[11px]">What&apos;s set up</Text>
        <SummaryRow title="Store profile" detail={`${storeName || "Your store"} · open ${openTime}–${closeTime}`} />
        <SummaryRow title={`${productsAdded} products`} detail="From the starter list · prices set" />
        <SummaryRow title="Stock alerts" detail={`Warn at ${thresholdDays} days of cover`} />
        <SummaryRow title="Register open" detail={`Float ${PESO.format(startingFloat)} counted`} />
      </Card>

      {finishError && (
        <Text accessibilityRole="alert" className="text-error text-[13px] mt-3.5">
          {finishError}
        </Text>
      )}

      <View className="mt-[18px] mb-6">
        <PrimaryButton label="Start selling" onPress={onFinish} loading={finishing} />
      </View>
    </View>
  );
}
