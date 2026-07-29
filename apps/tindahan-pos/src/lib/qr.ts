import QRCode from "qrcode";

/** Renders a supplier's scan_code as a printable QR code data URL (PNG). */
export function generateScanCodeQr(scanCode: string): Promise<string> {
  return QRCode.toDataURL(scanCode, { width: 240, margin: 1 });
}
