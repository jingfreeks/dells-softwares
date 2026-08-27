import type { ComponentProps } from "react";
import type { Feather } from "@expo/vector-icons";

export interface IconButtonProps {
  icon: ComponentProps<typeof Feather>["name"];
  onPress?: () => void;
  accessibilityLabel: string;
  /** Small dot shown top-right, e.g. for an unread notification (§9 Proposed `Badge`). */
  showBadge?: boolean;
}
