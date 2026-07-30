import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useStoreData } from "../lib/storeData";
import { makeProduct, makeStoreDataValue, makeSupplier } from "../test/testUtils";
import { Receiving } from "./Receiving";

vi.mock("../lib/storeData", () => ({ useStoreData: vi.fn() }));

vi.mock("../components/BarcodeScanner", () => ({
  BarcodeScanner: ({ onDetected, onClose }: { onDetected: (c: string) => void; onClose: () => void }) => (
    <div>
      <button type="button" onClick={() => onDetected("1234567890")}>
        Fake scan
      </button>
      <button type="button" onClick={onClose}>
        Close fake scanner
      </button>
    </div>
  ),
}));

const products = [makeProduct({ id: "p1", name: "Sardines", barcode: "1234567890", stock: 20 })];
const suppliers = [makeSupplier({ id: "sup1", name: "Mega Distribution" })];

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Receiving />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Receiving", () => {
  it("adds a product via search and saves the entry", async () => {
    const user = userEvent.setup();
    const receiveStock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products, suppliers, receiveStock })
    );
    renderPage();

    await user.type(screen.getByLabelText("Add a product"), "Sardines");
    await user.click(screen.getByText("Sardines"));

    expect(screen.getByDisplayValue("1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save receiving entry" }));

    expect(receiveStock).toHaveBeenCalledWith("Unspecified supplier", expect.any(String), [
      { productId: "p1", productName: "Sardines", quantity: 1, costEach: 0 },
    ], null);
    expect(await screen.findByText(/Saved — 1 product/)).toBeInTheDocument();
  });

  it("increments quantity when the same product is added twice", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, suppliers }));
    renderPage();

    await user.type(screen.getByLabelText("Add a product"), "Sardines");
    await user.click(screen.getByRole("button", { name: /Sardines/ }));
    await user.type(screen.getByLabelText("Add a product"), "Sardines");
    await user.click(screen.getByRole("button", { name: /Sardines/ }));

    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
  });

  it("removes a line", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, suppliers }));
    renderPage();

    await user.type(screen.getByLabelText("Add a product"), "Sardines");
    await user.click(screen.getByRole("button", { name: /Sardines/ }));
    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(screen.queryByDisplayValue("1")).not.toBeInTheDocument();
  });

  it("picks a supplier from the dropdown", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, suppliers }));
    renderPage();

    await user.selectOptions(screen.getByLabelText("Pick a saved supplier"), "sup1");
    expect(screen.getByLabelText("Supplier (optional)")).toHaveValue("Mega Distribution");
  });

  it("resets the linked supplier id when the dropdown is set back to blank", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, suppliers }));
    renderPage();

    const select = screen.getByLabelText("Pick a saved supplier");
    await user.selectOptions(select, "sup1");
    await user.selectOptions(select, "");
    expect(select).toHaveValue("");
  });

  it("edits the receiving date and a line's cost", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, suppliers }));
    renderPage();

    const dateInput = screen.getByLabelText("Date");
    await user.clear(dateInput);
    await user.type(dateInput, "2026-08-01");
    expect(dateInput).toHaveValue("2026-08-01");

    await user.type(screen.getByLabelText("Add a product"), "Sardines");
    await user.click(screen.getByRole("button", { name: /Sardines/ }));
    const costInput = screen.getAllByRole("spinbutton")[1];
    await user.clear(costInput);
    await user.type(costInput, "12.50");
    expect(costInput).toHaveValue(12.5);
  });

  it("clears the linked supplier id when typing directly", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, suppliers }));
    renderPage();

    await user.selectOptions(screen.getByLabelText("Pick a saved supplier"), "sup1");
    await user.clear(screen.getByLabelText("Supplier (optional)"));
    await user.type(screen.getByLabelText("Supplier (optional)"), "Someone else");
    expect(screen.getByLabelText("Pick a saved supplier")).toHaveValue("");
  });

  it("scans a product barcode via the camera", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, suppliers }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Scan item" }));
    await user.click(await screen.findByText("Fake scan"));

    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
  });

  it("shows an error for an unknown scanned barcode", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], suppliers }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Scan item" }));
    await user.click(await screen.findByText("Fake scan"));

    expect(await screen.findByRole("alert")).toHaveTextContent("No product found");
  });

  it("scans a supplier code and links it", async () => {
    const user = userEvent.setup();
    const findSupplierByScanCode = vi.fn().mockResolvedValue(suppliers[0]);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products, suppliers, findSupplierByScanCode })
    );
    renderPage();

    await user.click(screen.getByRole("button", { name: "Scan supplier code" }));
    await user.click(await screen.findByText("Fake scan"));

    expect(findSupplierByScanCode).toHaveBeenCalledWith("1234567890");
    await waitFor(() =>
      expect(screen.getByLabelText("Supplier (optional)")).toHaveValue("Mega Distribution")
    );
  });

  it("shows an error when the scanned supplier code has no match", async () => {
    const user = userEvent.setup();
    const findSupplierByScanCode = vi.fn().mockResolvedValue(null);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products, suppliers, findSupplierByScanCode })
    );
    renderPage();

    await user.click(screen.getByRole("button", { name: "Scan supplier code" }));
    await user.click(await screen.findByText("Fake scan"));

    expect(await screen.findByRole("alert")).toHaveTextContent("No supplier matches");
  });

  it("shows an error when the supplier scan lookup throws", async () => {
    const user = userEvent.setup();
    const findSupplierByScanCode = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products, suppliers, findSupplierByScanCode })
    );
    renderPage();

    await user.click(screen.getByRole("button", { name: "Scan supplier code" }));
    await user.click(await screen.findByText("Fake scan"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Network error");
  });

  it("closes the scanner without detecting", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, suppliers }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Scan item" }));
    await user.click(screen.getByText("Close fake scanner"));
    expect(screen.queryByText("Fake scan")).not.toBeInTheDocument();
  });

  it("validates a zero/invalid quantity before saving", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, suppliers }));
    renderPage();

    await user.type(screen.getByLabelText("Add a product"), "Sardines");
    await user.click(screen.getByText("Sardines"));
    const qtyInput = screen.getByDisplayValue("1");
    await user.clear(qtyInput);
    await user.click(screen.getByRole("button", { name: "Save receiving entry" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("needs a quantity of at least 1");
  });

  it("shows an error when saving fails", async () => {
    const user = userEvent.setup();
    const receiveStock = vi.fn().mockRejectedValue(new Error("Could not save"));
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products, suppliers, receiveStock })
    );
    renderPage();

    await user.type(screen.getByLabelText("Add a product"), "Sardines");
    await user.click(screen.getByText("Sardines"));
    await user.click(screen.getByRole("button", { name: "Save receiving entry" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save");
  });

  it("shows receiving history", () => {
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({
        products,
        suppliers,
        receivingHistory: [
          {
            id: "r1",
            date: "2026-07-20",
            supplier: "Mega Distribution",
            supplierId: "sup1",
            lines: [{ productId: "p1", productName: "Sardines", quantity: 10, costEach: 20 }],
          },
        ],
      })
    );
    renderPage();
    expect(screen.getAllByText(/Mega Distribution/).length).toBeGreaterThan(0);
    expect(screen.getByText(/10.*units/)).toBeInTheDocument();
  });

  it("shows an empty receiving history state", () => {
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, suppliers, receivingHistory: [] }));
    renderPage();
    expect(screen.getByText("No receiving entries yet this session.")).toBeInTheDocument();
  });
});
