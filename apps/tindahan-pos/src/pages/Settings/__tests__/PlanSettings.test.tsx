import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PlanSettings } from "../PlanSettings";
import type { StoreFeature } from "@/lib/features/featuresContext";

const state: { catalogue: StoreFeature[]; loading: boolean; writesAllowed: boolean } = {
  catalogue: [],
  loading: false,
  writesAllowed: true,
};

vi.mock("@/lib/features/featuresContext", async (orig) => ({
  ...(await orig<typeof import("@/lib/features/featuresContext")>()),
  useFeatures: () => ({
    features: new Set(state.catalogue.filter((f) => f.held).map((f) => f.code)),
    catalogue: state.catalogue,
    loading: state.loading,
  }),
}));

vi.mock("@/lib/billing/billingContext", async (orig) => ({
  ...(await orig<typeof import("@/lib/billing/billingContext")>()),
  useBillingState: () => ({
    organizationStatus: "ACTIVE",
    subscriptionStatus: state.writesAllowed ? "ACTIVE" : "SUSPENDED",
    writesAllowed: state.writesAllowed,
    graceEndsAt: null,
  }),
}));

const BASIC: StoreFeature[] = [
  { code: "pos.utang", moduleCode: "POS", name: "Utang (customer credit)", held: true },
  { code: "pos.eload", moduleCode: "POS", name: "E-load and cash-in", held: true },
  { code: "inventory.suppliers", moduleCode: "INVENTORY", name: "Suppliers", held: true },
  { code: "inventory.purchase_orders", moduleCode: "INVENTORY", name: "Purchase orders", held: false },
  { code: "inventory.transfers", moduleCode: "INVENTORY", name: "Stock transfers", held: false },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <PlanSettings />
    </MemoryRouter>
  );
}

beforeEach(() => {
  state.catalogue = BASIC;
  state.loading = false;
  state.writesAllowed = true;
});

describe("PlanSettings", () => {
  it("shows what the store holds", () => {
    renderPage();
    expect(screen.getByText("Utang (customer credit)")).toBeInTheDocument();
    expect(screen.getByText("Suppliers")).toBeInTheDocument();
  });

  // The whole point of the page. my_store_features() returns the entire
  // catalogue rather than only what is held precisely so a shopkeeper can see
  // what they are missing -- a tier nobody can see is a tier nobody buys.
  it("shows what the store does NOT hold, rather than hiding it", () => {
    renderPage();
    expect(screen.getByText("Purchase orders")).toBeInTheDocument();
    expect(screen.getByText("Stock transfers")).toBeInTheDocument();
    expect(screen.getByText(/Not in your plan/)).toBeInTheDocument();
  });

  it("groups by module, so an upgrade is a sentence and not a list of codes", () => {
    renderPage();
    expect(screen.getAllByText("Selling").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Stock and suppliers").length).toBeGreaterThan(0);
  });

  it("says so plainly when nothing is withheld, instead of an empty panel", () => {
    state.catalogue = BASIC.map((f) => ({ ...f, held: true }));
    renderPage();
    expect(screen.getByText(/holds every capability/)).toBeInTheDocument();
    expect(screen.queryByText(/Not in your plan/)).not.toBeInTheDocument();
  });

  it("renders nothing until the fetch resolves, so no capability flickers away", () => {
    state.loading = true;
    renderPage();
    expect(screen.queryByText("Utang (customer credit)")).not.toBeInTheDocument();
    expect(screen.queryByText(/Not in your plan/)).not.toBeInTheDocument();
  });

  // §08: a suspended tenant is told writes are paused -- and told, in the same
  // breath, that nothing has been taken away. The page must never imply the
  // data is gone.
  it("explains a write pause without suggesting anything was lost", () => {
    state.writesAllowed = false;
    renderPage();
    expect(screen.getByText(/New records are paused/)).toBeInTheDocument();
    expect(screen.getByText(/still here, and still yours to read and export/)).toBeInTheDocument();
  });

  it("says nothing about billing while writes are allowed", () => {
    renderPage();
    expect(screen.queryByText(/New records are paused/)).not.toBeInTheDocument();
  });
});
