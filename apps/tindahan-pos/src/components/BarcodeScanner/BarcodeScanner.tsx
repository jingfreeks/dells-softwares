import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  LABEL_SCAN_BARCODE,
  ARIA_CLOSE_SCANNER,
  TEXT_SCAN_HINT,
  ERROR_CAMERA_DENIED,
  ERROR_CAMERA_NOT_FOUND,
  ERROR_CAMERA_IN_USE,
  ERROR_CAMERA_GENERIC,
} from "@/lib";

const SCAN_ELEMENT_ID = "barcode-scanner-viewport";

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

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const detectedRef = useRef(false);

  useEffect(() => {
    detectedRef.current = false;

    if (!window.isSecureContext) {
      setError(
        "Camera access needs a secure connection (HTTPS). It won't work over a plain http:// address on your local network — try the deployed site instead, or use manual entry below."
      );
      return;
    }

    const scanner = new Html5Qrcode(SCAN_ELEMENT_ID, {
      formatsToSupport: BARCODE_FORMATS,
      verbose: false,
    });
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decodedText) => {
          if (detectedRef.current) return;
          detectedRef.current = true;
          onDetected(decodedText);
        },
        undefined
      )
      .catch((err: unknown) => {
        const name = err instanceof Error ? err.name : "";
        if (name === "NotAllowedError") {
          setError(ERROR_CAMERA_DENIED);
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setError(ERROR_CAMERA_NOT_FOUND);
        } else if (name === "NotReadableError") {
          setError(ERROR_CAMERA_IN_USE);
        } else {
          setError(ERROR_CAMERA_GENERIC);
        }
      });

    return () => {
      const s = scannerRef.current;
      if (s && s.isScanning) {
        s.stop().then(() => s.clear()).catch(() => {});
      } else {
        s?.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">{LABEL_SCAN_BARCODE}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={ARIA_CLOSE_SCANNER}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        ) : (
          <>
            <div
              id={SCAN_ELEMENT_ID}
              className="mt-3 overflow-hidden rounded-xl bg-slate-900"
            />
            <p className="mt-3 text-center text-xs text-slate-500">{TEXT_SCAN_HINT}</p>
          </>
        )}
      </div>
    </div>
  );
}
