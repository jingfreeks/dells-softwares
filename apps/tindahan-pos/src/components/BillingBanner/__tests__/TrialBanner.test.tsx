import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrialBanner } from "../TrialBanner";

describe("TrialBanner", () => {
  it("reads as informational with more than 3 days left", () => {
    render(<TrialBanner daysRemaining={8} onUpgradeClick={vi.fn()} />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent(/8 days left/i);
    expect(banner.className).toContain("amber-50");
  });

  it("reads as a warning at 3 days", () => {
    render(<TrialBanner daysRemaining={3} onUpgradeClick={vi.fn()} />);
    expect(screen.getByRole("status").className).toContain("amber-100");
  });

  it("reads as urgent on the final day", () => {
    render(<TrialBanner daysRemaining={1} onUpgradeClick={vi.fn()} />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent(/free trial ends in 1 day/i);
    expect(banner.className).toContain("red-50");
  });

  it("reads as urgent and says 'today' once the countdown hits zero", () => {
    render(<TrialBanner daysRemaining={0} onUpgradeClick={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent(/free trial ends today/i);
  });

  it("calls onUpgradeClick when the CTA is pressed", async () => {
    const onUpgradeClick = vi.fn();
    const user = userEvent.setup();
    render(<TrialBanner daysRemaining={5} onUpgradeClick={onUpgradeClick} />);
    await user.click(screen.getByRole("button", { name: /choose a plan/i }));
    expect(onUpgradeClick).toHaveBeenCalledTimes(1);
  });
});
