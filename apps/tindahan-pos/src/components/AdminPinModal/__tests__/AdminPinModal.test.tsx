import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminPinModal } from "../AdminPinModal";

// This dialog stands between a supervisor and two things the owner is meant to
// authorise: voiding a sale, and handing over cash above the cap. The PIN it
// collects is exchanged for a single-use token by the caller, so what matters
// here is that it cannot be dismissed or submitted by accident, and that a
// refusal is shown rather than swallowed.

function setup(overrides: Partial<Parameters<typeof AdminPinModal>[0]> = {}) {
  const props = {
    open: true,
    message: "This void needs an owner's PIN.",
    pin: "",
    onPinChange: vi.fn(),
    onSubmit: vi.fn(),
    pinError: null,
    submitting: false,
    onCancel: vi.fn(),
    ...overrides,
  };
  render(<AdminPinModal {...props} />);
  return props;
}

describe("AdminPinModal", () => {
  it("renders nothing when closed", () => {
    setup({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("names what is being approved", () => {
    setup();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("This void needs an owner's PIN.")).toBeInTheDocument();
  });

  it("uses a caller-supplied heading when one is given", () => {
    setup({ heading: "Cash-out needs approval" });
    expect(screen.getByText("Cash-out needs approval")).toBeInTheDocument();
  });

  it("cancels on the button and on a click outside the panel", async () => {
    const user = userEvent.setup();
    const { onCancel } = setup();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("dialog").parentElement!);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("does not cancel when the panel itself is clicked", async () => {
    const user = userEvent.setup();
    const { onCancel } = setup();

    await user.click(screen.getByRole("dialog"));
    expect(onCancel).not.toHaveBeenCalled();
  });

  // A refused PIN must be visible. Swallowing it would leave the supervisor
  // retyping a PIN that is never going to work.
  it("shows a refusal as an alert", () => {
    setup({ pinError: "INVALID_OVERRIDE_PIN" });
    expect(screen.getByRole("alert")).toHaveTextContent("INVALID_OVERRIDE_PIN");
  });

  // The dialog submits on its own once four digits are in, rather than waiting
  // for a confirm press -- so a full PIN arriving as a prop is the trigger, and
  // the caller does the token exchange from there.
  it("submits once the PIN is complete", () => {
    const { onSubmit } = setup({ pin: "1234" });
    expect(onSubmit).toHaveBeenCalledWith("1234");
  });

  it("does not submit a partial PIN", () => {
    const { onSubmit } = setup({ pin: "12" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not accept more digits while the exchange is in flight", async () => {
    const user = userEvent.setup();
    const { onPinChange } = setup({ pin: "12", submitting: true });

    await user.click(screen.getByRole("button", { name: "3" }));
    expect(onPinChange).not.toHaveBeenCalled();
  });

  it("blocks cancelling while the exchange is in flight", () => {
    setup({ submitting: true });
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
