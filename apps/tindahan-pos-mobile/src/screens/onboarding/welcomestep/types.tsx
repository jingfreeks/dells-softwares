export interface WelcomeStepProps {
  onStartSetup: () => void;
  onSkipToRegister: () => void;
}

export interface ChecklistItem {
  n: number;
  title: string;
  detail: string;
  time: string;
}

export const CHECKLIST: ChecklistItem[] = [
  {
    n: 1,
    title: "Store profile",
    detail: "Your name and shop details",
    time: "~1 min",
  },
  {
    n: 2,
    title: "Add products",
    detail: "Start from a ready-made list",
    time: "~4 min",
  },
  {
    n: 3,
    title: "Set stock alerts",
    detail: "We suggest a sensible default",
    time: "~1 min",
  },
  {
    n: 4,
    title: "Open the register",
    detail: "Count your starting cash",
    time: "~2 min",
  },
];