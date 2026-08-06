import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth, useStoreData, useFeatureFlag, validateAndOptimizeImage, uploadImage } from "@/lib";
import { makeAuthValue, makeProduct, makeStaffAccount, makeStoreDataValue } from "../../../test/testUtils";
import { Inventory } from "../Inventory";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/storeData", () => ({ useStoreData: vi.fn() }));
vi.mock("@/lib/featureFlags", () => ({ useFeatureFlag: vi.fn() }));
vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("@/lib/imageUpload", () => ({
  validateAndOptimizeImage: vi.fn(),
  uploadImage: vi.fn(),
}));

vi.mock("@/components/BarcodeScanner", () => ({
  BarcodeScanner: ({ onDetected, onClose }: { onDetected: (c: string) => void; onClose: () => void }) => (
    <div>
      <button type="button" onClick={() => onDetected("999999")}>
        Fake scan
      </button>
      <button type="button" onClick={onClose}>
        Close fake scanner
      </button>
    </div>
  ),
}));

const categories = [
  { id: "cat-1", name: "Canned goods" },
  { id: "cat-2", name: "Snacks" },
];

const products = [
  makeProduct({ id: "p1", name: "Sardines", categoryId: "cat-1", category: "Canned goods", stock: 20, barcode: "111" }),
  makeProduct({ id: "p2", name: "Chippy", categoryId: "cat-2", category: "Snacks", stock: 2, lowStockThreshold: 5, barcode: "222" }),
];

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Inventory />} />
        <Route path="/inventory/receiving" element={<p>Receiving page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

/** Opens a product row's "More actions" menu and returns the scope to query its items in. */
async function openRowMenu(user: ReturnType<typeof userEvent.setup>, rowName: string | RegExp) {
  const row = within(screen.getByRole("row", { name: rowName }));
  await user.click(row.getByRole("button", { name: "More actions" }));
  return row;
}

describe("Inventory", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(makeAuthValue());
  });

  it("shows a low-stock banner and the product table", () => {
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, categories }));
    renderPage();
    expect(screen.getByText(/running low or out of stock/)).toBeInTheDocument();
    expect(screen.getByText("Sardines")).toBeInTheDocument();
    expect(screen.getByText("Chippy")).toBeInTheDocument();
  });

  it("shows a loading skeleton", () => {
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories, loading: true }));
    renderPage();
    expect(screen.queryByText("No products match")).not.toBeInTheDocument();
  });

  it("filters by search query", async () => {
    const user = userEvent.setup();
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, categories }));
    renderPage();

    await user.type(screen.getByPlaceholderText("Search by name, category, or barcode"), "Sardines");
    expect(screen.getByText("Sardines")).toBeInTheDocument();
    expect(screen.queryByText("Chippy")).not.toBeInTheDocument();
  });

  it("filters by category", async () => {
    const user = userEvent.setup();
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, categories }));
    renderPage();

    await user.selectOptions(screen.getByDisplayValue("All categories"), "Snacks");
    expect(screen.queryByText("Sardines")).not.toBeInTheDocument();
    expect(screen.getByText("Chippy")).toBeInTheDocument();
  });

  it("shows a no-match message", async () => {
    const user = userEvent.setup();
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, categories }));
    renderPage();
    await user.type(screen.getByPlaceholderText("Search by name, category, or barcode"), "nonexistent");
    expect(screen.getByText('No products match "nonexistent".')).toBeInTheDocument();
  });

  it("paginates when there are more than 20 products", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 25 }, (_, i) =>
      makeProduct({ id: `p${i}`, name: `Product ${i}`, categoryId: "cat-1", category: "Canned goods" })
    );
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: many, categories }));
    renderPage();

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  });

  it("restocks a product", async () => {
    const user = userEvent.setup();
    const restock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, categories, restock }));
    renderPage();

    const row = await openRowMenu(user, "Sardines");
    await user.click(row.getByRole("menuitem", { name: "+10 stock" }));
    expect(restock).toHaveBeenCalledWith("p1", 10);
  });

  it("shows an error when restock fails", async () => {
    const user = userEvent.setup();
    const restock = vi.fn().mockRejectedValue(new Error("Could not restock"));
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, categories, restock }));
    renderPage();

    const row = await openRowMenu(user, "Sardines");
    await user.click(row.getByRole("menuitem", { name: "+10 stock" }));
    expect(await screen.findByText("Could not restock")).toBeInTheDocument();
  });

  it("removes a product", async () => {
    const user = userEvent.setup();
    const removeProduct = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, categories, removeProduct }));
    renderPage();

    const row = await openRowMenu(user, "Sardines");
    await user.click(row.getByRole("menuitem", { name: "Delete" }));
    expect(removeProduct).toHaveBeenCalledWith("p1");
  });

  it("shows an error when remove fails", async () => {
    const user = userEvent.setup();
    const removeProduct = vi.fn().mockRejectedValue(new Error("Could not remove"));
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, categories, removeProduct }));
    renderPage();

    const row = await openRowMenu(user, "Sardines");
    await user.click(row.getByRole("menuitem", { name: "Delete" }));
    expect(await screen.findByText("Could not remove")).toBeInTheDocument();
  });

  it("adds a new product", async () => {
    const user = userEvent.setup();
    const addProduct = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, categories, addProduct }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add product" }));
    await user.type(screen.getByLabelText("Name"), "Bread");
    await user.clear(screen.getByLabelText("Price"));
    await user.type(screen.getByLabelText("Price"), "40");
    const submit = screen.getAllByRole("button", { name: "Add product" });
    await user.click(submit[submit.length - 1]);

    expect(addProduct).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Bread", price: 40, categoryId: "cat-1" })
    );
  });

  it("validates required name", async () => {
    const user = userEvent.setup();
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add product" }));
    const submit = screen.getAllByRole("button", { name: "Add product" });
    await user.click(submit[submit.length - 1]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Product name is required.");
  });

  it("validates that a category is chosen when none exist", async () => {
    const user = userEvent.setup();
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories: [] }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add product" }));
    await user.type(screen.getByLabelText("Name"), "Bread");
    const submit = screen.getAllByRole("button", { name: "Add product" });
    await user.click(submit[submit.length - 1]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Choose a category.");
  });

  it("edits an existing product", async () => {
    const user = userEvent.setup();
    const updateProduct = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, categories, updateProduct }));
    renderPage();

    const row = await openRowMenu(user, "Sardines");
    await user.click(row.getByRole("menuitem", { name: "Edit" }));
    expect(screen.getByText("Edit product")).toBeInTheDocument();
    const submit = screen.getAllByRole("button", { name: "Save changes" });
    await user.click(submit[submit.length - 1]);

    expect(updateProduct).toHaveBeenCalledWith("p1", expect.objectContaining({ name: "Sardines" }));
  });

  it("warns about a duplicate barcode and can switch to the existing product", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, categories }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add product" }));
    await user.type(screen.getByLabelText(/Barcode/), "111");

    expect(await screen.findByText(/already used by/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open existing product" }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByText("Edit product")).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it("does not switch when the duplicate-barcode confirm is declined", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products, categories }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add product" }));
    await user.type(screen.getByLabelText(/Barcode/), "111");
    await screen.findByText(/already used by/);
    await user.click(screen.getByRole("button", { name: "Open existing product" }));

    expect(screen.getByText("Add product", { selector: "h2" })).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it("adds an inline category from the product form", async () => {
    const user = userEvent.setup();
    const addCategory = vi.fn().mockResolvedValue({ id: "cat-3", name: "Drinks" });
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories, addCategory }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add product" }));
    await user.selectOptions(screen.getByLabelText("Category"), "+ New category…");
    await user.type(screen.getByPlaceholderText("New category name"), "Drinks");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(addCategory).toHaveBeenCalledWith("Drinks");
  });

  it("cancels inline category creation", async () => {
    const user = userEvent.setup();
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add product" }));
    await user.selectOptions(screen.getByLabelText("Category"), "+ New category…");
    await user.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
  });

  it("closes the add-product form on Cancel", async () => {
    const user = userEvent.setup();
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add product" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Add product", { selector: "h2" })).not.toBeInTheDocument();
  });

  it("opens the category manager", async () => {
    const user = userEvent.setup();
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Categories" }));
    expect(screen.getByText("Manage categories")).toBeInTheDocument();
  });

  it("scans a barcode into the add-product form", async () => {
    const user = userEvent.setup();
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add product" }));
    await user.click(screen.getByRole("button", { name: "Scan with camera" }));
    await user.click(await screen.findByText("Fake scan"));

    expect(screen.getByDisplayValue("999999")).toBeInTheDocument();
  });

  it("toggles pack pricing when the feature flag is enabled", async () => {
    const user = userEvent.setup();
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add product" }));
    await user.click(screen.getByLabelText(/Sell by pack/));
    await user.clear(screen.getByLabelText("Pack size (pcs)"));
    await user.type(screen.getByLabelText("Pack size (pcs)"), "3");
    await user.clear(screen.getByLabelText("Pack price (₱)"));
    await user.type(screen.getByLabelText("Pack price (₱)"), "15");

    expect(screen.getByText(/per pc/)).toBeInTheDocument();
  });

  it("validates pack size when pack pricing is enabled", async () => {
    const user = userEvent.setup();
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add product" }));
    await user.type(screen.getByLabelText("Name"), "Bread");
    await user.click(screen.getByLabelText(/Sell by pack/));
    await user.clear(screen.getByLabelText("Pack size (pcs)"));
    await user.type(screen.getByLabelText("Pack size (pcs)"), "1");
    const submit = screen.getAllByRole("button", { name: "Add product" });
    await user.click(submit[submit.length - 1]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Pack size must be a whole number of 2 or more.");
  });

  it("does not show pack pricing controls when the feature flag is off", async () => {
    const user = userEvent.setup();
    vi.mocked(useFeatureFlag).mockReturnValue(false);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add product" }));
    expect(screen.queryByLabelText(/Sell by pack/)).not.toBeInTheDocument();
  });

  it("shows an error when saving a product fails", async () => {
    const user = userEvent.setup();
    const addProduct = vi.fn().mockRejectedValue(new Error("Barcode already used"));
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories, addProduct }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add product" }));
    await user.type(screen.getByLabelText("Name"), "Bread");
    const submit = screen.getAllByRole("button", { name: "Add product" });
    await user.click(submit[submit.length - 1]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Barcode already used");
  });

  it("links to the receiving page", async () => {
    const user = userEvent.setup();
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories }));
    renderPage();
    await user.click(screen.getByText("Receive stock"));
    expect(screen.getByText("Receiving page")).toBeInTheDocument();
  });

  it("shows pack price label in the table when applicable", () => {
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({
        products: [makeProduct({ id: "p3", name: "Egg", packQuantity: 3, packPrice: 15, categoryId: "cat-1", category: "Canned goods" })],
        categories,
      })
    );
    renderPage();
    const row = screen.getByRole("row", { name: "Egg" });
    expect(within(row).getByText(/for/)).toBeInTheDocument();
  });

  it("picks a real category from the dropdown", async () => {
    const user = userEvent.setup();
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add product" }));
    await user.selectOptions(screen.getByLabelText("Category"), "Snacks");
    expect(screen.getByLabelText("Category")).toHaveValue("cat-2");
  });

  it("shows an error when creating an inline category fails", async () => {
    const user = userEvent.setup();
    const addCategory = vi.fn().mockRejectedValue(new Error("Already exists"));
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories, addCategory }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add product" }));
    await user.selectOptions(screen.getByLabelText("Category"), "+ New category…");
    await user.type(screen.getByPlaceholderText("New category name"), "Drinks");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Already exists");
  });

  it("validates an invalid stock value", async () => {
    const user = userEvent.setup();
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add product" }));
    await user.type(screen.getByLabelText("Name"), "Bread");
    const stockInput = screen.getByLabelText("Stock");
    await user.clear(stockInput);
    await user.type(stockInput, "-5");
    const submit = screen.getAllByRole("button", { name: "Add product" });
    await user.click(submit[submit.length - 1]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Stock must be a valid number.");
  });

  it("edits the stock and low-stock threshold fields", async () => {
    const user = userEvent.setup();
    const addProduct = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories, addProduct }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add product" }));
    await user.type(screen.getByLabelText("Name"), "Bread");
    const stockInput = screen.getByLabelText("Stock");
    await user.clear(stockInput);
    await user.type(stockInput, "15");
    const thresholdInput = screen.getByLabelText("Low-stock at");
    await user.clear(thresholdInput);
    await user.type(thresholdInput, "3");
    const submit = screen.getAllByRole("button", { name: "Add product" });
    await user.click(submit[submit.length - 1]);

    expect(addProduct).toHaveBeenCalledWith(
      expect.objectContaining({ stock: 15, lowStockThreshold: 3 })
    );
  });

  it("validates an invalid pack price when pack pricing is enabled", async () => {
    const user = userEvent.setup();
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add product" }));
    await user.type(screen.getByLabelText("Name"), "Bread");
    await user.click(screen.getByLabelText(/Sell by pack/));
    await user.clear(screen.getByLabelText("Pack size (pcs)"));
    await user.type(screen.getByLabelText("Pack size (pcs)"), "3");
    await user.clear(screen.getByLabelText("Pack price (₱)"));
    await user.type(screen.getByLabelText("Pack price (₱)"), "-5");
    const submit = screen.getAllByRole("button", { name: "Add product" });
    await user.click(submit[submit.length - 1]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Pack price must be a valid number.");
  });

  it("closes the barcode scanner without detecting", async () => {
    const user = userEvent.setup();
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add product" }));
    await user.click(screen.getByRole("button", { name: "Scan with camera" }));
    await user.click(await screen.findByText("Close fake scanner"));
    expect(screen.queryByText("Fake scan")).not.toBeInTheDocument();
  });

  it("closes the category manager", async () => {
    const user = userEvent.setup();
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Categories" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Manage categories")).not.toBeInTheDocument();
  });

  describe("product photo", () => {
    beforeEach(() => {
      vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:preview"), revokeObjectURL: vi.fn() });
      vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ storeId: "store-1" }) }));
      vi.mocked(useFeatureFlag).mockReturnValue(true);
    });

    function makeImageFile() {
      return new File([new Uint8Array([1, 2, 3])], "sardines.jpg", { type: "image/jpeg" });
    }

    it("optimizes, uploads, and attaches a photo when adding a new product", async () => {
      const user = userEvent.setup();
      const addProduct = vi.fn().mockResolvedValue(makeProduct({ id: "p-new" }));
      const updateProduct = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useStoreData).mockReturnValue(
        makeStoreDataValue({ products: [], categories, addProduct, updateProduct })
      );
      const blob = new Blob(["x"], { type: "image/webp" });
      vi.mocked(validateAndOptimizeImage).mockResolvedValue(blob);
      vi.mocked(uploadImage).mockResolvedValue("https://cdn.test/store-1/p-new/image.webp");
      renderPage();

      await user.click(screen.getByRole("button", { name: "Add product" }));
      await user.type(screen.getByLabelText("Name"), "Bread");
      const fileInput = document.getElementById("pimage") as HTMLInputElement;
      await user.upload(fileInput, makeImageFile());
      expect(await screen.findByRole("button", { name: "Remove photo" })).toBeInTheDocument();

      const submit = screen.getAllByRole("button", { name: "Add product" });
      await user.click(submit[submit.length - 1]);

      expect(validateAndOptimizeImage).toHaveBeenCalledWith(expect.any(File), { maxDimension: 800 });
      expect(uploadImage).toHaveBeenCalledWith(expect.anything(), "product-images", "store-1/p-new/image.webp", blob);
      expect(updateProduct).toHaveBeenCalledWith("p-new", { imageUrl: "https://cdn.test/store-1/p-new/image.webp" });
    });

    it("shows an error when the selected file isn't a valid image", async () => {
      const user = userEvent.setup();
      vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: [], categories }));
      vi.mocked(validateAndOptimizeImage).mockRejectedValue(
        new Error("That file doesn't look like a valid image.")
      );
      renderPage();

      await user.click(screen.getByRole("button", { name: "Add product" }));
      const fileInput = document.getElementById("pimage") as HTMLInputElement;
      await user.upload(fileInput, makeImageFile());

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "That file doesn't look like a valid image."
      );
    });

    it("removes an existing photo when editing", async () => {
      const user = userEvent.setup();
      const updateProduct = vi.fn().mockResolvedValue(undefined);
      const withPhoto = [makeProduct({ id: "p1", name: "Sardines", imageUrl: "https://cdn.test/existing.webp" })];
      vi.mocked(useStoreData).mockReturnValue(
        makeStoreDataValue({ products: withPhoto, categories, updateProduct })
      );
      renderPage();

      const row = await openRowMenu(user, "Sardines");
      await user.click(row.getByRole("menuitem", { name: "Edit" }));
      await user.click(screen.getByRole("button", { name: "Remove photo" }));
      const submit = screen.getAllByRole("button", { name: "Save changes" });
      await user.click(submit[submit.length - 1]);

      expect(updateProduct).toHaveBeenCalledWith("p1", { imageUrl: null });
    });

    it("shows a product thumbnail in the table when the product has a photo", () => {
      const withPhoto = [makeProduct({ id: "p1", name: "Sardines", imageUrl: "https://cdn.test/existing.webp" })];
      vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ products: withPhoto, categories }));
      renderPage();

      const thumbnail = screen.getByRole("row", { name: /Sardines/ }).querySelector("img");
      expect(thumbnail).toHaveAttribute("src", "https://cdn.test/existing.webp");
    });
  });
});
