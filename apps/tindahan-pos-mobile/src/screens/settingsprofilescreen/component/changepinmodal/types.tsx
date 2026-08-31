export interface ChangePinModalProps {
  /** Whether a PIN already exists -- only changes the copy, not the flow. */
  hasPin: boolean;
  onClose: () => void;
}
