export interface PasswordInputProps {
  accessibilityLabel: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}
