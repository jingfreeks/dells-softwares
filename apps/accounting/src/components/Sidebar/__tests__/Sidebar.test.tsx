import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NAV_SECTIONS, Sidebar } from "../Sidebar";

describe("Sidebar", () => {
  it("carries the handoff's five sections", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    // Scoped to the nav on purpose: "Accounting" is both the product name in
    // the brand block and the first section heading, so an unscoped query is
    // ambiguous. That doubling is the design's, not a mistake to route around.
    const nav = within(screen.getByRole("navigation"));
    for (const section of ["Accounting", "Transactions", "Balances", "Reports", "Control"]) {
      expect(nav.getAllByText(section).length).toBeGreaterThan(0);
    }
  });

  it("keeps aging out of the rail", () => {
    // Handoff §2: Receivables → Aging and Payables → Aging were removed
    // because they duplicated Reports → AR/AP Aging. If someone adds them
    // back as nav items, this fails and they have to mean it.
    const labels = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.label));
    expect(labels.filter((l) => /aging/i.test(l))).toEqual([]);
  });

  it("lists the nine reports as one item, not nine rows", () => {
    const reports = NAV_SECTIONS.find((s) => s.title === "Reports");
    expect(reports?.items).toHaveLength(1);
  });

  it("shows what is not built yet rather than hiding it", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getByText("Payables")).toBeInTheDocument();
    expect(screen.getAllByText("Soon").length).toBeGreaterThan(0);
  });

  it("marks every unbuilt destination pending, so none of them navigate", () => {
    const built = NAV_SECTIONS.flatMap((s) => s.items).filter((i) => !i.pending);
    expect(built.map((i) => i.to)).toEqual(["/"]);
  });
});
