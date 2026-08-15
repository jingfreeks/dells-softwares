import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CloseShiftModal } from "./CloseShiftModal";

describe("CloseShiftModal", () => {
  it("confirms with the entered closing float", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<CloseShiftModal onConfirm={onConfirm} onSkip={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByRole("spinbutton"), "3175");
    await user.click(screen.getByRole("button", { name: "End shift" }));

    expect(onConfirm).toHaveBeenCalledWith(3175);
  });

  it("shows an error instead of confirming when the amount is blank", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<CloseShiftModal onConfirm={onConfirm} onSkip={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "End shift" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("calls onSkip without requiring an amount", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    render(<CloseShiftModal onConfirm={vi.fn()} onSkip={onSkip} onCancel={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Skip count" }));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
