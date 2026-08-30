import { useRef } from "react";
import { useCameraPermissions, type BarcodeScanningResult } from "expo-camera";

/** Camera permission + scan-debounce state for BarcodeScannerModal -- BarcodeScannerModal.tsx stays presentational. */
export function useBarcodeScannerModal(onDetected: (barcode: string) => void) {
  const [permission, requestPermission] = useCameraPermissions();
  // Debounce: the scanner fires repeatedly for the same code while it's in
  // frame — only act on the first hit per time the modal opens.
  const handledRef = useRef(false);

  function handleScan(result: BarcodeScanningResult) {
    if (handledRef.current) return;
    handledRef.current = true;
    onDetected(result.data);
  }

  function resetHandled() {
    handledRef.current = false;
  }

  return { permission, requestPermission, handleScan, resetHandled };
}
