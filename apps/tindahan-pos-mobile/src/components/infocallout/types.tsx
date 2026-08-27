import type { ComponentProps, ReactNode } from "react";
import type { Feather } from "@expo/vector-icons";

export type Tone = "info" | "success";

export interface InfoCalloutProps {
  icon: ComponentProps<typeof Feather>["name"];
  tone?: Tone;
  title: string;
  description: string;
  /** Optional trailing content, e.g. the register status card's cash amount (§5 M-004). */
  trailing?: ReactNode;
  onPress?: () => void;
}
