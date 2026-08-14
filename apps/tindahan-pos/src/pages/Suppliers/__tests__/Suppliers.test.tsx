import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth, useStoreData } from "@/lib";
import { makeAuthValue, makeStaffAccount, makeStoreDataValue, makeSupplier } from "../../../test/testUtils";
import { Suppliers } from "../Suppliers";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/storeData", () => ({ useStoreData: vi.fn() }));
vi.mock("@/lib/qr", () => ({ generateScanCodeQr: vi.fn().mockResolvedValue("data:image/png;base64,fake") }));

const categories = [{ id: "cat1", name: "Canned goods" }];

const suppliers = [
  makeSupplier({ id: "s1", name: "Mega Distribution" }),
  makeSupplier({ id: "s2", name: "Coca-Cola Bottlers", phone: null }),
];

async function submitLastButton(user: ReturnType<typeof userEvent.setup>, name: string) {
  const buttons = screen.getAllByRole("button", { name });
  await user.click(buttons[buttons.length - 1]);
}

async function openRowMenuFor(user: ReturnType<typeof userEvent.setup>, supplierIndex: number) {
  const menuButtons = screen.getAllByRole("button", { name: "More actions" });
  await user.click(menuButtons[supplierIndex]);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Suppliers />} />
      </Routes>
    </MemoryRouter>
  );
}

function setup(overrides: Parameters<typeof makeStoreDataValue>[0] = {}) {
  vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ role: "admin" }) }));
  vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ suppliers, categories, ...overrides }));
}

describe("Suppliers", () => {
  it("redirects a cashier away from the suppliers page", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ role: "cashier" }) }));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ suppliers: [] }));
    render(
      <MemoryRouter initialEntries={["/suppliers"]}>
        <Routes>
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/pos" element={<p>POS page</p>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("POS page")).toBeInTheDocument();
  });

  it("lists suppliers in the table", async () => {
    setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Mega Distribution")).toBeInTheDocument();
      expect(screen.getByText("Coca-Cola Bottlers")).toBeInTheDocument();
    });
  });

  it("shows an empty state with no suppliers", () => {
    setup({ suppliers: [] });
    renderPage();
    expect(screen.getByText("No suppliers yet")).toBeInTheDocument();
  });

  it("adds a new supplier", async () => {
    const user = userEvent.setup();
    const addSupplier = vi.fn().mockResolvedValue(makeSupplier({ id: "s3", name: "Nestle PH" }));
    setup({ suppliers: [], addSupplier });
    renderPage();

    await user.click(screen.getAllByRole("button", { name: "Add supplier" })[0]);
    await user.type(screen.getByLabelText("Business name"), "Nestle PH");
    await user.type(screen.getByLabelText("Mobile number"), "09171234567");
    await user.type(screen.getByLabelText("Address (optional)"), "Manila");
    await submitLastButton(user, "Add supplier");

    expect(addSupplier).toHaveBeenCalledWith({
      name: "Nestle PH",
      contactPerson: null,
      phone: "09171234567",
      address: "Manila",
      paymentTerms: "cash",
      categoryIds: [],
      usualDeliveryDays: [],
    });
  });

  it("shows a validation error when the name is blank", async () => {
    const user = userEvent.setup();
    setup({ suppliers: [] });
    renderPage();

    await user.click(screen.getAllByRole("button", { name: "Add supplier" })[0]);
    await submitLastButton(user, "Add supplier");

    expect(await screen.findByRole("alert")).toHaveTextContent("Name is required.");
  });

  it("shows an error when adding a supplier fails", async () => {
    const user = userEvent.setup();
    const addSupplier = vi.fn().mockRejectedValue(new Error("Duplicate name"));
    setup({ suppliers: [], addSupplier });
    renderPage();

    await user.click(screen.getAllByRole("button", { name: "Add supplier" })[0]);
    await user.type(screen.getByLabelText("Business name"), "Nestle PH");
    await submitLastButton(user, "Add supplier");

    expect(await screen.findByRole("alert")).toHaveTextContent("Duplicate name");
  });

  it("edits a supplier via the row menu", async () => {
    const user = userEvent.setup();
    const updateSupplier = vi.fn().mockResolvedValue(undefined);
    setup({ updateSupplier });
    renderPage();

    await waitFor(() => screen.getByText("Mega Distribution"));
    await openRowMenuFor(user, 0);
    await user.click(screen.getByRole("menuitem", { name: "Edit" }));

    const nameInput = screen.getByLabelText("Business name") as HTMLInputElement;
    expect(nameInput.value).toBe("Mega Distribution");
    await user.clear(nameInput);
    await user.type(nameInput, "Mega Distribution Corp");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateSupplier).toHaveBeenCalledWith("s1", {
      name: "Mega Distribution Corp",
      contactPerson: "Ronnie Cruz",
      phone: "09171234567",
      address: "Quezon City",
      paymentTerms: "cash",
      categoryIds: [],
      usualDeliveryDays: [],
    });
  });

  it("marks an owing supplier as paid via the row menu", async () => {
    const user = userEvent.setup();
    const markSupplierPaid = vi.fn().mockResolvedValue(undefined);
    const fetchReceivingHistoryInRange = vi.fn().mockResolvedValue([
      {
        id: "r1",
        date: "2026-08-01",
        supplier: "Mega Distribution",
        supplierId: "s1",
        drNumber: null,
        paid: false,
        paidAt: null,
        lines: [{ productId: "p1", productName: "Sardines", quantity: 5, costEach: 20 }],
      },
    ]);
    setup({ markSupplierPaid, fetchReceivingHistoryInRange });
    renderPage();

    await waitFor(() => screen.getByText("Mega Distribution"));
    await openRowMenuFor(user, 0);
    await user.click(screen.getByRole("menuitem", { name: "Mark as paid" }));

    expect(markSupplierPaid).toHaveBeenCalledWith("s1");
  });

  it("deactivates a supplier via the row menu", async () => {
    const user = userEvent.setup();
    const deactivateSupplier = vi.fn().mockResolvedValue(undefined);
    setup({ deactivateSupplier });
    renderPage();

    await waitFor(() => screen.getByText("Mega Distribution"));
    await openRowMenuFor(user, 0);
    await user.click(screen.getByRole("menuitem", { name: "Deactivate" }));

    expect(deactivateSupplier).toHaveBeenCalledWith("s1");
  });

  it("prints a single supplier's code via the row menu, building the document via DOM APIs", async () => {
    const user = userEvent.setup();
    const fakeDoc = document.implementation.createHTMLDocument("");
    const openSpy = vi.spyOn(window, "open").mockReturnValue({
      document: fakeDoc,
      focus: vi.fn(),
      print: vi.fn(),
    } as unknown as Window);
    setup();
    renderPage();

    await waitFor(() => screen.getByText("Mega Distribution"));
    await openRowMenuFor(user, 0);
    await user.click(screen.getByRole("menuitem", { name: "Print code" }));

    await waitFor(() => expect(openSpy).toHaveBeenCalledWith("", "_blank"));
    expect(fakeDoc.title).toBe("Mega Distribution — Supplier code");
    expect(fakeDoc.body.textContent).toContain("Mega Distribution");
    expect(fakeDoc.querySelector("img")?.getAttribute("alt")).toBe("Scan code for Mega Distribution");
    openSpy.mockRestore();
  });

  it("escapes a supplier name containing markup instead of injecting it (single print)", async () => {
    const user = userEvent.setup();
    const maliciousSuppliers = [makeSupplier({ id: "s9", name: '<img src=x onerror="window.__pwned=true">' })];
    const fakeDoc = document.implementation.createHTMLDocument("");
    const openSpy = vi.spyOn(window, "open").mockReturnValue({
      document: fakeDoc,
      focus: vi.fn(),
      print: vi.fn(),
    } as unknown as Window);
    setup({ suppliers: maliciousSuppliers });
    renderPage();

    await waitFor(() => screen.getByText('<img src=x onerror="window.__pwned=true">'));
    await openRowMenuFor(user, 0);
    await user.click(screen.getByRole("menuitem", { name: "Print code" }));

    await waitFor(() => expect(openSpy).toHaveBeenCalled());
    // The malicious name must render as inert text, not as a second <img>
    // element with an onerror handler.
    expect(fakeDoc.querySelectorAll("img")).toHaveLength(1);
    expect(fakeDoc.body.textContent).toContain('<img src=x onerror="window.__pwned=true">');
    openSpy.mockRestore();
  });

  it("prints a multi-supplier scan sheet, escaping any markup in supplier names", async () => {
    const user = userEvent.setup();
    const maliciousSuppliers = [
      makeSupplier({ id: "s1", name: "Mega Distribution" }),
      makeSupplier({ id: "s9", name: '<img src=x onerror="window.__pwned=true">' }),
    ];
    const fakeDoc = document.implementation.createHTMLDocument("");
    const openSpy = vi.spyOn(window, "open").mockReturnValue({
      document: fakeDoc,
      focus: vi.fn(),
      print: vi.fn(),
    } as unknown as Window);
    setup({ suppliers: maliciousSuppliers });
    renderPage();

    await waitFor(() => screen.getByText("Mega Distribution"));
    await user.click(screen.getByRole("button", { name: "Print scan sheet" }));

    await waitFor(() => expect(fakeDoc.querySelectorAll("img")).toHaveLength(2));
    expect(fakeDoc.querySelectorAll("img")).toHaveLength(2);
    expect(fakeDoc.body.textContent).toContain('<img src=x onerror="window.__pwned=true">');
    openSpy.mockRestore();
  });

  it("filters the table by search query", async () => {
    const user = userEvent.setup();
    setup();
    renderPage();

    await waitFor(() => screen.getByText("Mega Distribution"));
    await user.type(screen.getByPlaceholderText(/search/i), "Coca");

    expect(screen.queryByText("Mega Distribution")).not.toBeInTheDocument();
    expect(screen.getByText("Coca-Cola Bottlers")).toBeInTheDocument();
  });
});
