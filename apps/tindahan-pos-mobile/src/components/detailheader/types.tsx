import type { ComponentProps } from "react";
import type { Feather } from "@expo/vector-icons";

export interface DetailHeaderProps {
  title: string;
  subtitle: string;
  onBack?: () => void;
  trailingIcon?: ComponentProps<typeof Feather>["name"];
  trailingLabel?: string;
  onTrailingPress?: () => void;
}
