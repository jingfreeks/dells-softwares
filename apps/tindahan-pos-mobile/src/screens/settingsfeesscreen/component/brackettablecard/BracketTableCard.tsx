import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../../../components/card";
import { TextField } from "../../../../components/textfield";
import { bracketMin, formatAmount } from "../../../../lib/fees";
import { colors } from "../../../../theme/colors";
import type { BracketTableCardProps } from "./types";

/**
 * One editable fee table. The lower bound of each row is derived, not
 * entered: brackets are an ordered list of ceilings, so a row starts just
 * past the previous ceiling. That makes overlapping ranges impossible by
 * construction rather than something to validate after the fact.
 *
 * Every column here flexes rather than taking a fixed width -- ceilings in
 * the tens of thousands are ordinary for cash-in and cash-out, and fixed
 * widths clipped them at five digits.
 */
export function BracketTableCard({
  table,
  title,
  brackets,
  onFeeChange,
  onMaxChange,
  onAdd,
  onRemove,
}: BracketTableCardProps) {
  return (
    <Card padding={14} style={{ marginBottom: 14 }}>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-[13.5px] font-medium text-text-primary">{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Add ${title} bracket`} onPress={onAdd}>
          <Text className="text-[12.5px] text-accent">Add bracket</Text>
        </Pressable>
      </View>

      {brackets.map((bracket, index) => {
        const min = bracketMin(brackets, index);
        return (
          <View key={`${table}-${index}`} className="flex-row items-center gap-1.5 py-1.5">
            <Text
              className="text-[13px] text-text-dim"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ minWidth: 52 }}
            >
              ₱{formatAmount(min)}
            </Text>
            <Text className="text-[13px] text-text-faint">–</Text>
            <View className="flex-1">
              <TextField
                accessibilityLabel={`${title} bracket ${index + 1} up to`}
                value={String(bracket.max)}
                onChangeText={(value) => onMaxChange(index, value)}
                keyboardType="number-pad"
                maxLength={7}
              />
            </View>
            <View className="flex-1">
              <TextField
                accessibilityLabel={`${title} bracket ${index + 1} fee`}
                value={`₱${bracket.fee}`}
                onChangeText={(value) => onFeeChange(index, value)}
                keyboardType="number-pad"
                maxLength={8}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${title} bracket ${index + 1}`}
              onPress={() => onRemove(index)}
              disabled={brackets.length <= 1}
              className="p-1"
              style={{ opacity: brackets.length <= 1 ? 0.3 : 1 }}
            >
              <Feather name="minus-circle" size={16} color={colors.textFaint} />
            </Pressable>
          </View>
        );
      })}

      {brackets.length > 0 && (
        <Text className="text-[11.5px] text-text-faint mt-1.5">
          Anything above ₱{formatAmount(brackets[brackets.length - 1].max)} is charged the last fee.
        </Text>
      )}
    </Card>
  );
}
