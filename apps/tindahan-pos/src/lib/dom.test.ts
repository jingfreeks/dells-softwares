import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEscapeToClose } from "./dom";

describe("useEscapeToClose", () => {
  it("calls onClose when Escape is pressed while open", () => {
    const onClose = vi.fn();
    renderHook(() => useEscapeToClose(true, onClose));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does nothing when closed", () => {
    const onClose = vi.fn();
    renderHook(() => useEscapeToClose(false, onClose));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("ignores keys other than Escape", () => {
    const onClose = vi.fn();
    renderHook(() => useEscapeToClose(true, onClose));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("stops listening once unmounted", () => {
    const onClose = vi.fn();
    const { unmount } = renderHook(() => useEscapeToClose(true, onClose));

    unmount();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(onClose).not.toHaveBeenCalled();
  });
});
