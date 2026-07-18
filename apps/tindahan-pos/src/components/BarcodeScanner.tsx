import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

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
          setError(
            "Camera access was denied. Allow camera access for this site in your browser settings, or use manual entry below."
          );
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setError("No camera was found on this device. Use manual entry below instead.");
        } else if (name === "NotReadableError") {
          setError(
            "The camera is already in use by another app or tab. Close it and try again, or use manual entry below."
          );
        } else {
          setError(
            "Could not access the camera. Check that you've allowed camera access for this site, or use manual entry below."
          );
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
          <h2 className="text-sm font-semibold text-slate-900">Scan barcode</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scanner"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
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
              className="mt-3 overflow-hidden rounded-lg bg-slate-900"
            />
            <p className="mt-3 text-center text-xs text-slate-500">
              Point the camera at a barcode. It scans automatically.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
