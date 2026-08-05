import { describe, expect, it, vi } from "vitest";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,fake") },
}));

import QRCode from "qrcode";
import { generateScanCodeQr } from "../qr";

describe("generateScanCodeQr", () => {
  it("encodes the scan code into a data URL", async () => {
    const url = await generateScanCodeQr("abc123");
    expect(url).toBe("data:image/png;base64,fake");
    expect(QRCode.toDataURL).toHaveBeenCalledWith("abc123", { width: 240, margin: 1 });
  });
});
