import type { ComponentProps } from "react";
import type { Feather } from "@expo/vector-icons";

export interface MethodTileProps {
  icon: ComponentProps<typeof Feather>["name"];
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}
