import { Pressable, Text } from "react-native";
import type { ActionPillProps } from "./types";

/** Small capsule action button embedded in a ListRow, e.g. "Order" / "Remind" (§5 M-004, §9). */
export function ActionPill({ label, onPress }: ActionPillProps) {
  return (
    <Pressable onPress={onPress} className="rounded-chip bg-accent px-3.5 py-[7px]" hitSlop={6}>
      <Text className="text-xs font-medium text-text-primary">{label}</Text>
    </Pressable>
  );
}
