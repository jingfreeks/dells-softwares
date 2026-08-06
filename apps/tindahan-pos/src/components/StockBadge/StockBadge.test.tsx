import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StockBadge } from "./StockBadge";

describe("StockBadge", () => {
  it("renders in-stock label", () => {
    render(<StockBadge status="in-stock" />);
    expect(screen.getByText("In stock")).toBeInTheDocument();
  });

  it("renders low stock label", () => {
    render(<StockBadge status="low" />);
    expect(screen.getByText("Low stock")).toBeInTheDocument();
  });

  it("renders out of stock label", () => {
    render(<StockBadge status="out" />);
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });
});
