export interface BarcodeScannerModalProps {
  visible: boolean;
  onDetected: (barcode: string) => void;
  onClose: () => void;
}
