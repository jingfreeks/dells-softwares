export interface ToggleRowProps {
  title: string;
  detail: string;
  value: boolean;
  onToggle: () => void;
  isLast?: boolean;
}
