import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../../../../components/Card";
import { PESO } from "../../../../../lib/money";
import { colors } from "../../../../../theme/colors";
import type { CashHealthCardProps } from "./types";

export function CashHealthCard({ cashHealth, averageSaleValue }: CashHealthCardProps) {
  const good = cashHealth.level === "good";

  return (
    <Card
      padding={13}
      style={{
        marginBottom: 12,
        backgroundColor: good ? "rgba(74, 222, 128, 0.08)" : "rgba(251, 191, 36, 0.08)",
        borderColor: good ? "rgba(74, 222, 128, 0.26)" : "rgba(251, 191, 36, 0.26)",
      }}
    >
      <View className="flex-row gap-2.5 items-start">
        <Feather name="info" size={17} color={good ? colors.success : colors.warning} />
        <View className="flex-1">
          <Text className="text-[13px] font-medium" style={{ color: good ? colors.successDim : colors.warningDim }}>
            {good ? "Plenty of small notes and coins" : "Mostly large bills"}
          </Text>
          <Text className="text-[11.5px] text-text-faint mt-0.5">
            {averageSaleValue > 0
              ? `Average sale is about ${PESO.format(averageSaleValue)} — ${
                  good ? "this covers change comfortably" : "you may run short on change"
                }.`
              : good
                ? "This should cover change comfortably."
                : "You may run short on change for smaller sales."}
          </Text>
        </View>
      </View>
    </Card>
  );
}
