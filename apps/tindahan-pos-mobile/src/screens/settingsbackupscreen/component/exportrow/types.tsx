import type { ComponentProps } from "react";
import type { Feather } from "@expo/vector-icons";

export interface ExportRowProps {
  icon: ComponentProps<typeof Feather>["name"];
  label: string;
  description: string;
  /** Shows a spinner and blocks re-entry while this row's file is being written and shared. */
  busy: boolean;
  /** Nothing to export yet -- the row explains itself rather than handing over an empty file. */
  disabled: boolean;
  onPress: () => void;
}
