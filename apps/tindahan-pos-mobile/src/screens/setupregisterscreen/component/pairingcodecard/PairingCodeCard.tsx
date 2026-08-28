import { Text, View } from "react-native";
import { Card } from "../../../../components/card";
import { PrimaryButton } from "../../../../components/primarybutton";
import { formatCountdown } from "../../hooks";
import type { PairingCodeCardProps } from "./types";

export function PairingCodeCard({ code, msLeft, generating, generateError, onGenerate }: PairingCodeCardProps) {
  if (!code) {
    return (
      <>
        <PrimaryButton label="Generate a pairing code" onPress={onGenerate} loading={generating} />
        {generateError && (
          <Text accessibilityRole="alert" className="text-error text-[12.5px] mt-2 mb-1.5">
            {generateError}
          </Text>
        )}
      </>
    );
  }

  return (
    <Card padding={16} style={{ alignItems: "center", marginBottom: 16 }}>
      <Text className="text-[10px] font-medium text-text-faint tracking-[0.8px] mb-2.5">
        READ THIS CODE OUT AT THE COUNTER
      </Text>
      <View className="flex-row gap-2 mb-2">
        {code.split("").map((char, i) => (
          <View
            key={i}
            className="w-12 h-[52px] rounded-input bg-[rgba(59,130,246,0.14)] border border-accent items-center justify-center"
          >
            <Text className="text-[23px] font-medium text-text-primary">{char}</Text>
          </View>
        ))}
      </View>
      <Text className="text-xs text-text-faint mb-2.5">
        Expires in {formatCountdown(msLeft)}
        {msLeft <= 0 ? "" : " · refreshes automatically"}
      </Text>
      {msLeft <= 0 && <PrimaryButton label="Generate a new code" onPress={onGenerate} loading={generating} />}
    </Card>
  );
}
