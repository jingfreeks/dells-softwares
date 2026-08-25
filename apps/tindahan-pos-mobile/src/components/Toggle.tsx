import { Pressable, StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

interface ToggleProps {
  value: boolean;
  onToggle: () => void;
  accessibilityLabel: string;
}

/** Small on/off switch (`.tog`, §9) -- onboarding's stock-alert toggles. */
export function Toggle({ value, onToggle, accessibilityLabel }: ToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      onPress={onToggle}
      style={[styles.track, value && styles.trackOn]}
    >
      <View style={[styles.thumb, value && styles.thumbOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 2,
    justifyContent: "center",
  },
  trackOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textPrimary,
  },
  thumbOn: { alignSelf: "flex-end" },
});
