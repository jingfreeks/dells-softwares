import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../components/card";
import { PrimaryButton } from "../../components/primarybutton";
import { SecondaryButton } from "../../components/secondarybutton";
import { ScreenContainer } from "../../components/screencontainer";
import { colors } from "../../theme/colors";
import type { TrialExpiredScreenProps } from "./types";

/** Trial Expired (mobile-34) -- a full-screen state, not a dismissible toast. */
export function TrialExpiredScreen({ onChoosePlan, onContactSupport }: TrialExpiredScreenProps) {
  return (
    <ScreenContainer scrollable={false}>
      <View className="flex-1 items-center justify-center">
        <Card padding={26} style={{ alignItems: "center", width: "100%" }}>
          <View
            style={{ backgroundColor: "rgba(251,191,36,.14)", borderColor: "rgba(251,191,36,.32)" }}
            className="w-[42px] h-[42px] rounded-icon-square border items-center justify-center mb-4"
          >
            <Feather name="clock" size={20} color={colors.warning} />
          </View>
          <Text className="text-[17px] font-medium text-text-primary mb-2 text-center">
            Your free trial has ended
          </Text>
          <Text className="text-[13px] leading-[21px] text-text-dim text-center mb-5">
            Your store data is safe and hasn&apos;t gone anywhere — sales, products, customers and
            reports are all exactly where you left them.
          </Text>
          <View className="w-full mb-2.5">
            <PrimaryButton label="Choose a Plan" onPress={onChoosePlan} />
          </View>
          <View className="w-full">
            <SecondaryButton label="Contact Support" onPress={onContactSupport} />
          </View>
        </Card>
      </View>
    </ScreenContainer>
  );
}
