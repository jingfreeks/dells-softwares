export interface RestockScreenProps {
  onBack?: () => void;
  activeTab: string;
  onChangeTab: (tab: string) => void;
}
