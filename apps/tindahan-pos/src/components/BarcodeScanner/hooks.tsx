import { useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

export const useBarcodeScanner = () => {
  const SCAN_ELEMENT_ID = "barcode-scanner-viewport";
  const ERROR_MESSAGES="Camera access needs a secure connection (HTTPS). It won't work over a plain http:// address on your local network — try the deployed site instead, or use manual entry below.";
  const BARCODE_FORMATS = [
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.CODABAR,
    Html5QrcodeSupportedFormats.ITF,
    // Supplier records are identified by a printed QR code (see Suppliers.tsx)
    // rather than a 1D barcode — QR encodes the code far more compactly at a
    // small printed size. Same shared scanner as product barcodes.
    Html5QrcodeSupportedFormats.QR_CODE,
  ];

  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const detectedRef = useRef(false);

  return {
    SCAN_ELEMENT_ID,
    ERROR_MESSAGES,
    BARCODE_FORMATS,
    error,
    scannerRef,
    detectedRef,
    setError,   
  };
};
