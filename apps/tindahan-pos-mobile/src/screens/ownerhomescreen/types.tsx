export interface OwnerHomeScreenProps {
  activeTab: string;
  onChangeTab: (tab: string) => void;
  onOpenTodaysSales?: () => void;
  onOpenRestock?: () => void;
  onOpenUtang?: () => void;
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
