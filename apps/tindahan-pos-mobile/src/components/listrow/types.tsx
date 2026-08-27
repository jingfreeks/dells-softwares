import type { ComponentProps, ReactNode } from "react";
import type { Feather } from "@expo/vector-icons";

export type Tone = "default" | "warning" | "error";

export interface ListRowProps {
  icon: ComponentProps<typeof Feather>["name"];
  tone?: Tone;
  title: string;
  subtitle: string;
  /** Trailing content -- an ActionPill (attention rows) or an amount Text (recent-sales rows). */
  trailing?: ReactNode;
  onPress?: () => void;
}
