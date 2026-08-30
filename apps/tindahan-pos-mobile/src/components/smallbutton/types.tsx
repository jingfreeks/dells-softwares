export interface SmallButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Defaults to the mockup's 32pt row height; the footer pairs it with PrimaryButton at 48. */
  height?: number;
}
