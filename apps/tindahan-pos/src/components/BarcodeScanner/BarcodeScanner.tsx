import { useEffect} from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  ERROR_CAMERA_DENIED,
  ERROR_CAMERA_NOT_FOUND,
  ERROR_CAMERA_IN_USE,
  ERROR_CAMERA_GENERIC,
} from "@/lib";
import type { BarcodeScannerProps } from "./types";
import { Scanlabel,Errorlabel } from "./component";
import { useBarcodeScanner } from "./hooks";

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const {
    SCAN_ELEMENT_ID,
    ERROR_MESSAGES,
    BARCODE_FORMATS,
    error,
    scannerRef,
    detectedRef,
    setError,
  } = useBarcodeScanner();

  useEffect(() => {
    detectedRef.current = false;

    if (!window.isSecureContext) {
      setError(
        ERROR_MESSAGES
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
        undefined,
      )
      .catch((err: unknown) => {
        const name = err instanceof Error ? err.name : "";
        if (name === "NotAllowedError") {
          setError(ERROR_CAMERA_DENIED);
        } else if (
          name === "NotFoundError" ||
          name === "OverconstrainedError"
        ) {
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
        s.stop()
          .then(() => s.clear())
          .catch(() => {});
      } else {
        s?.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl">
        <Scanlabel onClose={onClose} />
        <Errorlabel error={error} SCAN_ELEMENT_ID={SCAN_ELEMENT_ID} />
      </div>
    </div>
  );
}
