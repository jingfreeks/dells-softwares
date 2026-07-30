import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useStoreData } from "../lib/storeData";
import { makeAuthValue, makeCustomer, makeProduct, makeStaffAccount, makeStoreDataValue } from "../test/testUtils";
import { Topbar } from "./Topbar";

vi.mock("../lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("../lib/storeData", () => ({ useStoreData: vi.fn() }));

const products = [
  makeProduct({ id: "p1", name: "Sardines", category: "Canned goods" }),
  makeProduct({ id: "p2", name: "Sarsi cola", category: "Drinks" }),
];
const customers = [makeCustomer({ id: "c1", name: "Sara Reyes", phone: "0917" })];

function SeededPage({ label }: { label: string }) {
  const location = useLocation();
  const seed = (location.state as { initialQuery?: string } | null)?.initialQuery ?? null;
  return (
    <p>
      {label}, seeded: {JSON.stringify(seed)}
    </p>
  );
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/admin" element={<Topbar />} />
        <Route path="/inventory" element={<SeededPage label="Inventory page" />} />
        <Route path="/customers" element={<SeededPage label="Customers page" />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Topbar", () => {
  it("shows the signed-in user's name and role", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ name: "Aling Nena", role: "admin" }) }));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();
    expect(screen.getByText("Aling Nena")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("shows a fallback avatar initial when there is no user", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: null }));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("shows no dropdown until there is a query", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, customers }));
    renderPage();
    expect(screen.queryByText("Products")).not.toBeInTheDocument();
  });

  it("shows matching products and customers grouped in a dropdown", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, customers }));
    renderPage();

    await user.type(screen.getByPlaceholderText("Search products or customers…"), "sar");

    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("Sardines")).toBeInTheDocument();
    expect(screen.getByText("Sarsi cola")).toBeInTheDocument();
    expect(screen.getByText("Customers")).toBeInTheDocument();
    expect(screen.getByText("Sara Reyes")).toBeInTheDocument();
  });

  it("shows a no-matches message when nothing matches", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, customers }));
    renderPage();

    await user.type(screen.getByPlaceholderText("Search products or customers…"), "zzz");
    expect(screen.getByText('No matches for "zzz".')).toBeInTheDocument();
  });

  it("navigates to Inventory seeded with the product name when a product result is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, customers }));
    renderPage();

    await user.type(screen.getByPlaceholderText("Search products or customers…"), "Sardines");
    await user.click(screen.getByText("Sardines"));

    expect(await screen.findByText(/Inventory page, seeded:/)).toHaveTextContent("Sardines");
  });

  it("navigates to Customers seeded with the customer name when a customer result is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, customers }));
    renderPage();

    await user.type(screen.getByPlaceholderText("Search products or customers…"), "Sara Reyes");
    await user.click(screen.getByText("Sara Reyes"));

    expect(await screen.findByText(/Customers page, seeded:/)).toHaveTextContent("Sara Reyes");
  });

  it("submitting with a product match navigates to Inventory", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, customers }));
    renderPage();

    await user.type(screen.getByPlaceholderText("Search products or customers…"), "sar{Enter}");
    expect(await screen.findByText(/Inventory page, seeded:/)).toHaveTextContent("sar");
  });

  it("submitting with only a customer match navigates to Customers", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], customers }));
    renderPage();

    await user.type(screen.getByPlaceholderText("Search products or customers…"), "Sara{Enter}");
    expect(await screen.findByText(/Customers page, seeded:/)).toHaveTextContent("Sara");
  });

  it("submitting a blank query does nothing", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, customers }));
    renderPage();

    await user.type(screen.getByPlaceholderText("Search products or customers…"), "   {Enter}");
    expect(screen.queryByText(/Inventory page, seeded:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Customers page, seeded:/)).not.toBeInTheDocument();
  });

  it("closes the dropdown on blur", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, customers }));
    renderPage();

    const input = screen.getByPlaceholderText("Search products or customers…");
    await user.type(input, "sar");
    expect(screen.getByText("Products")).toBeInTheDocument();

    await user.tab();
    await vi.waitFor(() => expect(screen.queryByText("Products")).not.toBeInTheDocument());
  });
});
