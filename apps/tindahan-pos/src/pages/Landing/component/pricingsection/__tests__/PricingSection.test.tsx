import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PricingSection } from "../PricingSection";

function renderPricing() {
  return render(
    <MemoryRouter>
      <PricingSection />
    </MemoryRouter>
  );
}

describe("PricingSection", () => {
  it("shows Starter/Growth/Business with monthly prices by default", () => {
    renderPricing();
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Growth")).toBeInTheDocument();
    expect(screen.getByText("Business")).toBeInTheDocument();
    expect(screen.getByText(/₱299/)).toBeInTheDocument();
    expect(screen.getByText(/₱599/)).toBeInTheDocument();
    expect(screen.getByText("Let's Talk")).toBeInTheDocument();
  });

  it("swaps to annual pricing and shows the savings badge, leaving the Let's Talk tier untouched", async () => {
    const user = userEvent.setup();
    renderPricing();

    await user.click(screen.getByRole("button", { name: "Annual" }));

    expect(screen.getByText(/₱2,990/)).toBeInTheDocument();
    expect(screen.getByText(/₱5,990/)).toBeInTheDocument();
    expect(screen.getByText(/Save 17%/)).toBeInTheDocument();
    expect(screen.getByText("Let's Talk")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Monthly" }));
    expect(screen.getByText(/₱299/)).toBeInTheDocument();
    expect(screen.queryByText(/Save 17%/)).not.toBeInTheDocument();
  });

  it("Growth's CTA carries the real BUSINESS plan code, Starter's stays plain, and Business talks to a human", () => {
    renderPricing();
    const links = screen.getAllByRole("link", { name: /Get started|Talk to us/ }).map((l) => l.getAttribute("href"));
    expect(links).toEqual(["/register", "/register?plan=BUSINESS", "#demo"]);
  });
});
