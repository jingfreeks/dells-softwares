export interface OwnerHomeScreenProps {
  activeTab: string;
  onChangeTab: (tab: string) => void;
  onOpenTodaysSales?: () => void;
  onOpenRestock?: () => void;
  onOpenUtang?: () => void;
  /** Opens Review. Always offered — a store without the entitlement gets the upgrade state there, which is the point of showing it. */
  onOpenReview?: () => void;
}

export interface AttentionRow {
  key: string;
  icon: "alert-circle" | "box" | "book";
  tone: "error" | "warning";
  title: string;
  subtitle: string;
  actionLabel: string;
  onPress?: () => void;
}
