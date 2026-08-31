import type { ComponentProps } from "react";
import type { Feather } from "@expo/vector-icons";
import type { AlertsMock } from "../../lib/alertsMock";

export interface SettingsAlertsScreenProps {
  onBack: () => void;
}

type BooleanKey = {
  [K in keyof AlertsMock]: AlertsMock[K] extends boolean ? K : never;
}[keyof AlertsMock];

export interface ChannelOption {
  key: Extract<BooleanKey, "pushEnabled" | "smsEnabled" | "emailEnabled">;
  icon: ComponentProps<typeof Feather>["name"];
  label: string;
  /** The mockup's second line -- what this channel is actually used for. */
  detail: string;
}

/** Approved copy from mobile-settings-alerts.html's "How and when" card. */
export const CHANNELS: readonly ChannelOption[] = [
  { key: "pushEnabled", icon: "bell", label: "Push", detail: "This device" },
  { key: "smsEnabled", icon: "message-square", label: "SMS", detail: "Money only" },
  { key: "emailEnabled", icon: "mail", label: "Email", detail: "Off" },
];
