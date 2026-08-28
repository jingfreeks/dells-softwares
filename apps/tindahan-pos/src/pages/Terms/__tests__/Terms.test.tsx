import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Terms } from "../Terms";

function renderTerms() {
  return render(
    <MemoryRouter>
      <Terms />
    </MemoryRouter>
  );
}

describe("Terms", () => {
  it("renders the terms with a working back-to-home link", () => {
    renderTerms();
    expect(screen.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/");
  });

  it("covers acceptable use, pricing, and termination", () => {
    renderTerms();
    expect(screen.getByText("Acceptable use")).toBeInTheDocument();
    expect(screen.getByText("Pricing and billing")).toBeInTheDocument();
    expect(screen.getByText("Termination")).toBeInTheDocument();
  });
});
