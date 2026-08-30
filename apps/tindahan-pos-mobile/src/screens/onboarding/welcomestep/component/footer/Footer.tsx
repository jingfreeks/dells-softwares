import { Text } from "react-native";
import type { FooterProps } from "./types";

export function Footer({ label }: FooterProps) {
  return <Text className="text-center mt-2 text-[11.5px] text-text-faint">{label}</Text>;
}
