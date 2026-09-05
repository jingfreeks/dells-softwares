export interface ReviewScreenProps {
  activeTab: string;
  onChangeTab: (tab: string) => void;
  onBack: () => void;
  /** Opens the existing pricing screen, which is where an upgrade starts. */
  onUpgrade: () => void;
  /** Opens Restock, which is the mobile app's low-stock screen. */
  onViewLowStock: () => void;
  /** Opens Utang, filtered by that screen's own controls. */
  onViewOverdue: () => void;
}

export const REVIEW_BENEFITS = [
  "Understand your sales",
  "Spot low-stock products",
  "Review outstanding utang",
  "Find products that need attention",
  "Track business performance",
] as const;
