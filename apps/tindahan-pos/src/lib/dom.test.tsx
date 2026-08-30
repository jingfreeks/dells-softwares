import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, renderHook, screen, fireEvent } from "@testing-library/react";
import { useEscapeToClose, useFocusTrap } from "./dom";

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

function TestDialog({ open }: { open: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, containerRef);
  return (
    <div>
      <button>Trigger</button>
      {open && (
        <div ref={containerRef} role="dialog">
          <button>First</button>
          <button>Middle</button>
          <button>Last</button>
        </div>
      )}
    </div>
  );
}

describe("useFocusTrap", () => {
  it("moves focus into the dialog when it opens", () => {
    render(<TestDialog open={true} />);
    expect(screen.getByText("First")).toHaveFocus();
  });

  it("wraps Tab from the last element back to the first", () => {
    render(<TestDialog open={true} />);
    screen.getByText("Last").focus();

    fireEvent.keyDown(document, { key: "Tab" });

    expect(screen.getByText("First")).toHaveFocus();
  });

  it("wraps Shift+Tab from the first element back to the last", () => {
    render(<TestDialog open={true} />);
    expect(screen.getByText("First")).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });

    expect(screen.getByText("Last")).toHaveFocus();
  });

  it("does not intercept Tab between elements in the middle", () => {
    render(<TestDialog open={true} />);
    screen.getByText("Middle").focus();

    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("restores focus to the trigger once the dialog closes", () => {
    const { rerender } = render(<TestDialog open={false} />);
    screen.getByText("Trigger").focus();
    expect(screen.getByText("Trigger")).toHaveFocus();

    rerender(<TestDialog open={true} />);
    expect(screen.getByText("First")).toHaveFocus();

    rerender(<TestDialog open={false} />);
    expect(screen.getByText("Trigger")).toHaveFocus();
  });
});
