export interface UtangScreenProps {
  onBack?: () => void;
  activeTab: string;
  onChangeTab: (tab: string) => void;
}
