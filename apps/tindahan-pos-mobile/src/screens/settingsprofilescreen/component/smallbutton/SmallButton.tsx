import { Pressable, Text } from "react-native";
import type { SmallButtonProps } from "./types";

/**
 * The mockup's `.btn sm` -- a compact neutral button sitting at the right
 * of a settings row ("Change", "Set", "Discard").
 *
 * Not SecondaryButton: that one is hardcoded as the Google sign-in button
 * (it renders a "G" badge before its label, per its own doc comment) and
 * is full-width with a bottom margin, so it can't serve as a general
 * neutral button.
 */
export function SmallButton({ label, onPress, disabled, height = 32 }: SmallButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={{ height }}
      className={`px-3.5 items-center justify-center border border-hairline rounded-button bg-panel-strong ${
        disabled ? "opacity-40" : ""
      }`}
    >
      <Text className="text-[12.5px] font-medium text-text-primary">{label}</Text>
    </Pressable>
  );
}
