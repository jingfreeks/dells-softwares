export interface WelcomeStepProps {
  ownerName: string;
  onExploreDemo: () => void;
  onSetUpStore: () => void;
}

export interface ChoiceTickItem {
  label: string;
}

export interface ChoiceCardData {
  icon: "monitor" | "home";
  title: string;
  description: string;
  ticks: ChoiceTickItem[];
  ctaLabel: string;
  accentColor: string;
  accentBackground: string;
  accentBorder: string;
}
