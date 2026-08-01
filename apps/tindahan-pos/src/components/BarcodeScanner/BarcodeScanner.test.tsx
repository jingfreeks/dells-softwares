import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BarcodeScanner } from "./BarcodeScanner";

const startMock = vi.fn();
const stopMock = vi.fn().mockResolvedValue(undefined);
const clearMock = vi.fn();

vi.mock("html5-qrcode", () => {
  class Html5Qrcode {
    isScanning = false;
    start(
      _cameraConfig: unknown,
      _scanConfig: unknown,
      onSuccess: (text: string) => void,
      _onError: unknown
    ) {
      (Html5Qrcode as unknown as { lastOnSuccess: (text: string) => void }).lastOnSuccess = onSuccess;
      return startMock();
    }
    stop() {
      return stopMock();
    }
    clear() {
      return clearMock();
    }
  }
  return {
    Html5Qrcode,
    Html5QrcodeSupportedFormats: {
      EAN_13: 1,
      EAN_8: 2,
      UPC_A: 3,
      UPC_E: 4,
      CODE_128: 5,
      CODE_39: 6,
      CODABAR: 7,
      ITF: 8,
      QR_CODE: 9,
    },
  };
});

describe("BarcodeScanner", () => {
  beforeEach(() => {
    startMock.mockReset().mockResolvedValue(undefined);
    stopMock.mockClear();
    clearMock.mockClear();
    Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
  });

  it("shows an insecure-context error and skips starting the camera", () => {
    Object.defineProperty(window, "isSecureContext", { value: false, configurable: true });
    render(<BarcodeScanner onDetected={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("secure connection");
    expect(startMock).not.toHaveBeenCalled();
  });

  it("renders the scan viewport when the camera starts successfully", () => {
    render(<BarcodeScanner onDetected={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Point the camera at a barcode. It scans automatically.")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<BarcodeScanner onDetected={vi.fn()} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Close scanner" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["NotAllowedError", "Camera access was denied"],
    ["NotFoundError", "No camera was found"],
    ["NotReadableError", "already in use"],
    ["SomeOtherError", "Could not access the camera"],
  ])("shows a friendly message for %s", async (name, expectedText) => {
    const err = new Error("boom");
    err.name = name;
    startMock.mockReturnValue(Promise.reject(err));
    render(<BarcodeScanner onDetected={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(expectedText);
  });

  it("reports a decoded code exactly once even if the scanner fires twice", async () => {
    const onDetected = vi.fn();
    render(<BarcodeScanner onDetected={onDetected} onClose={vi.fn()} />);
    await waitFor(() => expect(startMock).toHaveBeenCalled());

    type WithSuccess = typeof import("html5-qrcode").Html5Qrcode & {
      lastOnSuccess: (text: string) => void;
    };
    const { Html5Qrcode } = await import("html5-qrcode");
    const onSuccess = (Html5Qrcode as unknown as WithSuccess).lastOnSuccess;

    onSuccess("111222333");
    onSuccess("111222333");

    expect(onDetected).toHaveBeenCalledTimes(1);
    expect(onDetected).toHaveBeenCalledWith("111222333");
  });

  it("stops and clears the scanner on unmount while it is still scanning", async () => {
    const { Html5Qrcode } = await import("html5-qrcode");
    const OriginalStart = Html5Qrcode.prototype.start;
    (Html5Qrcode.prototype as unknown as { start: (...args: unknown[]) => unknown }).start = function (
      this: InstanceType<typeof Html5Qrcode>,
      ...args: unknown[]
    ) {
      this.isScanning = true;
      return (OriginalStart as (...a: unknown[]) => unknown).apply(this, args);
    };

    const { unmount } = render(<BarcodeScanner onDetected={vi.fn()} onClose={vi.fn()} />);
    await waitFor(() => expect(startMock).toHaveBeenCalled());
    unmount();

    expect(stopMock).toHaveBeenCalled();
    Html5Qrcode.prototype.start = OriginalStart;
  });
});
