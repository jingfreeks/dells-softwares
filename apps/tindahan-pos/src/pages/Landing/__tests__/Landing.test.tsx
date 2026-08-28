import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Landing } from "../Landing";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

function renderLanding() {
  return render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>
  );
}

describe("Landing", () => {
  it("renders every section with its key content", () => {
    renderLanding();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Know your sales/);
    expect(screen.getByText(/No expensive POS machine required/)).toBeInTheDocument();
    expect(screen.getByText(/A notebook can.t tell you what you.re losing/)).toBeInTheDocument();
    expect(screen.getByText("Fast checkout")).toBeInTheDocument();
    expect(screen.getByText(/Your store doesn.t need expensive hardware/)).toBeInTheDocument();
    expect(screen.getByText("Built around the counter, not the spreadsheet.")).toBeInTheDocument();
    expect(screen.getByText("Priced for a shop, not an enterprise.")).toBeInTheDocument();
    expect(screen.getByText("Fifteen minutes, your actual products.")).toBeInTheDocument();
    expect(screen.getByText("The things owners ask us first.")).toBeInTheDocument();
    expect(screen.getByText("Find out if it fits your shop.")).toBeInTheDocument();
    expect(screen.getByText(/Dells Software\. Tindahan POS/)).toBeInTheDocument();
  });

  it("every in-page nav anchor points at a section that actually exists", () => {
    renderLanding();
    for (const id of ["features", "how", "pricing", "faq", "demo", "top"]) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it("sets the tab title on mount", () => {
    renderLanding();
    expect(document.title).toMatch(/Tindahan POS by Dells Software/);
  });
});
