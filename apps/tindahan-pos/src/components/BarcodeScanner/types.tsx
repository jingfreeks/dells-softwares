export interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}