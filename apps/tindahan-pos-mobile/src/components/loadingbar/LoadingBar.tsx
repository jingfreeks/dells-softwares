import { View } from "react-native";
import type { LoadingBarProps } from "./types";

/** Thin filled progress bar, Splash only (§5 M-001, §9). */
export function LoadingBar({ progress, width = 120 }: LoadingBarProps) {
  return (
    <View className="h-[3px] rounded-[2px] bg-[rgba(255,255,255,0.08)] overflow-hidden" style={{ width }}>
      <View className="h-full rounded-[2px] bg-accent" style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
    </View>
  );
}
