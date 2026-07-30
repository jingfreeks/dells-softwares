import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useStoreData } from "../lib/storeData";
import { makeAuthValue, makeStaffAccount, makeStoreDataValue, makeSupplier } from "../test/testUtils";
import { Suppliers } from "./Suppliers";

vi.mock("../lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("../lib/storeData", () => ({ useStoreData: vi.fn() }));
vi.mock("../lib/qr", () => ({ generateScanCodeQr: vi.fn().mockResolvedValue("data:image/png;base64,fake") }));

const suppliers = [
  makeSupplier({ id: "s1", name: "Mega Distribution" }),
  makeSupplier({ id: "s2", name: "Coca-Cola Bottlers", phone: null }),
];

async function submitSupplierForm(user: ReturnType<typeof userEvent.setup>, name: string) {
  const buttons = screen.getAllByRole("button", { name });
  await user.click(buttons[buttons.length - 1]);
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

  it("lists suppliers", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ role: "admin" }) }));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ suppliers }));
    renderPage();
    expect(screen.getByText("Mega Distribution")).toBeInTheDocument();
    expect(screen.getByText("Coca-Cola Bottlers")).toBeInTheDocument();
  });

  it("shows an empty state with no suppliers", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ role: "admin" }) }));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ suppliers: [] }));
    renderPage();
    expect(screen.getByText("No suppliers yet.")).toBeInTheDocument();
  });

  it("adds a new supplier and shows its QR code", async () => {
    const user = userEvent.setup();
    const addSupplier = vi.fn().mockResolvedValue(makeSupplier({ id: "s3", name: "Nestle PH" }));
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ role: "admin" }) }));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ suppliers: [], addSupplier }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add supplier" }));
    await user.type(screen.getByLabelText("Name"), "Nestle PH");
    await user.type(screen.getByLabelText("Phone (optional)"), "09171234567");
    await user.type(screen.getByLabelText("Address (optional)"), "Manila");
    await submitSupplierForm(user, "Add supplier");

    expect(addSupplier).toHaveBeenCalledWith("Nestle PH", "09171234567", "Manila");
  });

  it("shows a validation error when the name is blank", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ role: "admin" }) }));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ suppliers: [] }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add supplier" }));
    await submitSupplierForm(user, "Add supplier");

    expect(await screen.findByRole("alert")).toHaveTextContent("Name is required.");
  });

  it("shows an error when adding a supplier fails", async () => {
    const user = userEvent.setup();
    const addSupplier = vi.fn().mockRejectedValue(new Error("Duplicate name"));
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ role: "admin" }) }));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ suppliers: [], addSupplier }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add supplier" }));
    await user.type(screen.getByLabelText("Name"), "Nestle PH");
    await submitSupplierForm(user, "Add supplier");

    expect(await screen.findByRole("alert")).toHaveTextContent("Duplicate name");
  });

  it("selects a supplier and edits it", async () => {
    const user = userEvent.setup();
    const updateSupplier = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ role: "admin" }) }));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ suppliers, updateSupplier }));
    renderPage();

    await user.click(screen.getByText("Mega Distribution"));
    expect(await screen.findByAltText("Scan code for Mega Distribution")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, "Mega Distribution Corp");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateSupplier).toHaveBeenCalledWith("s1", {
      name: "Mega Distribution Corp",
      phone: "09171234567",
      address: "Quezon City",
    });
  });

  it("prints the supplier's QR code by building the print document via DOM APIs", async () => {
    const user = userEvent.setup();
    // A real (detached) Document, not a hand-rolled mock — handlePrint now
    // builds the print window via createElement/textContent rather than
    // document.write(), specifically so a supplier name can never be
    // interpreted as markup. Exercising the real DOM APIs here catches a
    // regression back to the unsafe pattern.
    const fakeDoc = document.implementation.createHTMLDocument("");
    const openSpy = vi.spyOn(window, "open").mockReturnValue({
      document: fakeDoc,
      focus: vi.fn(),
      print: vi.fn(),
    } as unknown as Window);
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ role: "admin" }) }));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ suppliers }));
    renderPage();

    await user.click(screen.getByText("Mega Distribution"));
    await screen.findByAltText("Scan code for Mega Distribution");
    await user.click(screen.getByRole("button", { name: "Print code" }));

    expect(openSpy).toHaveBeenCalledWith("", "_blank");
    expect(fakeDoc.title).toBe("Mega Distribution — Supplier code");
    expect(fakeDoc.body.textContent).toContain("Mega Distribution");
    expect(fakeDoc.querySelector("img")?.getAttribute("alt")).toBe("Scan code for Mega Distribution");
    openSpy.mockRestore();
  });

  it("escapes a supplier name containing markup instead of injecting it", async () => {
    const user = userEvent.setup();
    const maliciousSuppliers = [
      makeSupplier({ id: "s9", name: '<img src=x onerror="window.__pwned=true">' }),
    ];
    const fakeDoc = document.implementation.createHTMLDocument("");
    const openSpy = vi.spyOn(window, "open").mockReturnValue({
      document: fakeDoc,
      focus: vi.fn(),
      print: vi.fn(),
    } as unknown as Window);
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ role: "admin" }) }));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ suppliers: maliciousSuppliers }));
    renderPage();

    await user.click(screen.getByText('<img src=x onerror="window.__pwned=true">'));
    await screen.findByAltText('Scan code for <img src=x onerror="window.__pwned=true">');
    await user.click(screen.getByRole("button", { name: "Print code" }));

    // The malicious name must render as inert text, not as a second <img>
    // element with an onerror handler.
    expect(fakeDoc.querySelectorAll("img")).toHaveLength(1);
    expect(fakeDoc.body.textContent).toContain('<img src=x onerror="window.__pwned=true">');
    openSpy.mockRestore();
  });

  it("shows a placeholder when nothing is selected", () => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ role: "admin" }) }));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ suppliers }));
    renderPage();
    expect(screen.getByText("Select a supplier to view and print their scan code.")).toBeInTheDocument();
  });
});
