import { StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

interface LoadingBarProps {
  /** 0-1 fill fraction. Splash's reference shows a fixed 0.62 (§5 M-001) -- not animated here; TBD per §5. */
  progress: number;
  width?: number;
}

/** Thin filled progress bar, Splash only (§5 M-001, §9). */
export function LoadingBar({ progress, width = 120 }: LoadingBarProps) {
  return (
    <View style={[styles.track, { width }]}>
      <View style={[styles.fill, { width: `${Math.max(0, Math.min(1, progress)) * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 2, backgroundColor: colors.accent },
});
