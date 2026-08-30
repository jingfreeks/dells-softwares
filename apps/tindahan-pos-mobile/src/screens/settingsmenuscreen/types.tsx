import type { ComponentProps } from "react";
import type { Feather } from "@expo/vector-icons";

export type SettingsSectionKey = "profile" | "store" | "receipts" | "fees" | "alerts" | "backup";

export interface SettingsMenuItem {
  key: SettingsSectionKey;
  icon: ComponentProps<typeof Feather>["name"];
  title: string;
  description: string;
  /**
   * Mirrors the web app's own route-level gate (RequireRole roles={["admin"]}
   * on every settings route except the profile one) -- a cashier signed in on
   * their own phone can edit how they appear and sign in, but not the store's
   * configuration. The real boundary is server-side RLS either way; this only
   * keeps a cashier from opening a screen whose every write would be
   * silently filtered.
   */
  adminOnly: boolean;
}

/** Titles and descriptions are the approved copy from mobile-settings-menu.html. */
export const SETTINGS_MENU_ITEMS: readonly SettingsMenuItem[] = [
  {
    key: "profile",
    icon: "user",
    title: "Your profile",
    description: "How you appear and sign in",
    adminOnly: false,
  },
  {
    key: "store",
    icon: "shopping-bag",
    title: "Store details",
    description: "Appears on receipts and reports",
    adminOnly: true,
  },
  {
    key: "receipts",
    icon: "file-text",
    title: "Receipts",
    description: "What the customer gets after a sale",
    adminOnly: true,
  },
  {
    key: "fees",
    icon: "dollar-sign",
    title: "Fees and limits",
    description: "What you charge, what staff can do",
    adminOnly: true,
  },
  {
    key: "alerts",
    icon: "bell",
    title: "Alerts",
    description: "What reaches you, when, and how",
    adminOnly: true,
  },
  {
    key: "backup",
    icon: "database",
    title: "Backup",
    description: "Your sales history, kept safe",
    adminOnly: true,
  },
];

export interface SettingsMenuScreenProps {
  onBack: () => void;
  onOpenSection: (key: SettingsSectionKey) => void;
}
