import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TrialExpired } from "../TrialExpired";

function renderPage() {
  return render(
    <MemoryRouter>
      <TrialExpired />
    </MemoryRouter>
  );
}

describe("TrialExpired", () => {
  it("says nothing was deleted and selling still works", () => {
    renderPage();
    expect(screen.getByText(/nothing has been deleted/i)).toBeInTheDocument();
    expect(screen.getByText(/selling still works/i)).toBeInTheDocument();
  });

  it("links to Pricing and to continuing on Basic", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "Choose a plan" })).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("link", { name: "Continue on Basic" })).toHaveAttribute("href", "/admin");
  });
});
