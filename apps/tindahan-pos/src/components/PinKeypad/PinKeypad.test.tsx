import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PinKeypad } from "./PinKeypad";

function Wrapper({ onSubmit }: { onSubmit?: (value: string) => void }) {
  const [value, setValue] = useState("");
  return <PinKeypad value={value} onChange={setValue} onSubmit={onSubmit} ariaLabel="Enter PIN" />;
}

describe("PinKeypad", () => {
  it("renders 0-9 and a backspace key", () => {
    render(<Wrapper />);
    for (const digit of ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]) {
      expect(screen.getByRole("button", { name: digit })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Backspace" })).toBeInTheDocument();
  });

  it("fills dots as digits are pressed, and calls onSubmit once length digits are entered", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Wrapper onSubmit={onSubmit} />);

    for (const digit of ["1", "2", "3"]) {
      await user.click(screen.getByRole("button", { name: digit }));
    }
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "4" }));
    expect(onSubmit).toHaveBeenCalledWith("1234");
  });

  it("removes the last digit on backspace", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(screen.getByRole("button", { name: "5" }));
    await user.click(screen.getByRole("button", { name: "6" }));
    await user.click(screen.getByRole("button", { name: "Backspace" }));

    const status = screen.getByRole("status", { name: "Enter PIN" });
    const filledDots = status.querySelectorAll(".tpl-on");
    expect(filledDots).toHaveLength(1);
  });

  it("ignores digit presses once the PIN is full", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Wrapper onSubmit={onSubmit} />);

    for (const digit of ["1", "2", "3", "4"]) {
      await user.click(screen.getByRole("button", { name: digit }));
    }
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "5" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
