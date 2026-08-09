import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DebtAgingSummary } from "@/lib/customers";
import { DebtAgeCard } from "./DebtAgeCard";

function makeAging(overrides: Partial<DebtAgingSummary> = {}): DebtAgingSummary {
  return {
    bucket0to14: 100,
    bucket15to30: 200,
    bucketOver30: 300,
    total: 600,
    overThirtyPercent: 50,
    ...overrides,
  };
}

describe("DebtAgeCard", () => {
  it("renders bucket labels derived from the default 30-day threshold", () => {
    render(<DebtAgeCard aging={makeAging()} thresholdDays={30} />);
    expect(screen.getByText("0–15 days")).toBeInTheDocument();
    expect(screen.getByText("16–30 days")).toBeInTheDocument();
    expect(screen.getByText("Over 30 days")).toBeInTheDocument();
  });

  it("renders bucket labels derived from a custom threshold", () => {
    render(<DebtAgeCard aging={makeAging()} thresholdDays={14} />);
    expect(screen.getByText("0–7 days")).toBeInTheDocument();
    expect(screen.getByText("8–14 days")).toBeInTheDocument();
    expect(screen.getByText("Over 14 days")).toBeInTheDocument();
  });

  it("shows the peso amounts for each bucket and the summary line", () => {
    render(<DebtAgeCard aging={makeAging()} thresholdDays={30} />);
    expect(screen.getByText("₱100.00")).toBeInTheDocument();
    expect(screen.getByText("₱200.00")).toBeInTheDocument();
    expect(screen.getByText("₱300.00")).toBeInTheDocument();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });
});
