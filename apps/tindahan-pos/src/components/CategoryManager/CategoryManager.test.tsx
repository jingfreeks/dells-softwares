import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useStoreData } from "@/lib";
import { makeProduct, makeStoreDataValue } from "../../test/testUtils";
import { CategoryManager } from "./CategoryManager";

vi.mock("@/lib/storeData", () => ({ useStoreData: vi.fn() }));

const categories = [
  { id: "cat-1", name: "Canned goods" },
  { id: "cat-2", name: "Snacks" },
];

describe("CategoryManager", () => {
  it("lists categories with product usage counts", () => {
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ categories, products: [makeProduct({ categoryId: "cat-1" })] })
    );
    render(<CategoryManager onClose={vi.fn()} />);
    expect(screen.getByText("Canned goods")).toBeInTheDocument();
    expect(screen.getByText("1 product")).toBeInTheDocument();
    expect(screen.getByText("0 products")).toBeInTheDocument();
  });

  it("calls onClose when Close is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ categories: [] }));
    render(<CategoryManager onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("adds a new category", async () => {
    const user = userEvent.setup();
    const addCategory = vi.fn().mockResolvedValue({ id: "cat-3", name: "Drinks" });
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ categories: [], addCategory }));
    render(<CategoryManager onClose={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("New category name"), "Drinks");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(addCategory).toHaveBeenCalledWith("Drinks");
  });

  it("shows an error when adding a category fails", async () => {
    const user = userEvent.setup();
    const addCategory = vi.fn().mockRejectedValue(new Error("Already exists"));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ categories: [], addCategory }));
    render(<CategoryManager onClose={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("New category name"), "Drinks");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Already exists");
  });

  it("renames a category", async () => {
    const user = userEvent.setup();
    const renameCategory = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ categories, renameCategory }));
    render(<CategoryManager onClose={vi.fn()} />);

    await user.click(screen.getAllByRole("button", { name: "Rename" })[0]);
    const input = screen.getByDisplayValue("Canned goods");
    await user.clear(input);
    await user.type(input, "Canned");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(renameCategory).toHaveBeenCalledWith("cat-1", "Canned");
  });

  it("cancels an in-progress rename", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ categories }));
    render(<CategoryManager onClose={vi.fn()} />);

    await user.click(screen.getAllByRole("button", { name: "Rename" })[0]);
    expect(screen.getByDisplayValue("Canned goods")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByDisplayValue("Canned goods")).not.toBeInTheDocument();
  });

  it("deletes a category that has no products", async () => {
    const user = userEvent.setup();
    const removeCategory = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ categories, removeCategory }));
    render(<CategoryManager onClose={vi.fn()} />);

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    expect(removeCategory).toHaveBeenCalledWith("cat-1");
  });

  it("disables delete for a category still in use", () => {
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ categories, products: [makeProduct({ categoryId: "cat-1" })] })
    );
    render(<CategoryManager onClose={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: "Delete" })[0]).toBeDisabled();
  });

  it("shows an empty state when there are no categories", () => {
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ categories: [] }));
    render(<CategoryManager onClose={vi.fn()} />);
    expect(screen.getByText("No categories yet.")).toBeInTheDocument();
  });

  it("shows a delete error", async () => {
    const user = userEvent.setup();
    const removeCategory = vi.fn().mockRejectedValue(new Error("Still in use"));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ categories, removeCategory }));
    render(<CategoryManager onClose={vi.fn()} />);

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Still in use");
  });

  it("adds a category via Enter key and ignores rename Enter with blank name", async () => {
    const user = userEvent.setup();
    const addCategory = vi.fn().mockResolvedValue({ id: "cat-3", name: "Drinks" });
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ categories: [], addCategory }));
    render(<CategoryManager onClose={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("New category name"), "Drinks{Enter}");
    expect(addCategory).toHaveBeenCalledWith("Drinks");
  });

  it("does nothing when Enter is pressed on a blank add-category input", async () => {
    const user = userEvent.setup();
    const addCategory = vi.fn();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ categories: [], addCategory }));
    render(<CategoryManager onClose={vi.fn()} />);

    await user.click(screen.getByPlaceholderText("New category name"));
    await user.keyboard("{Enter}");
    expect(addCategory).not.toHaveBeenCalled();
  });

  it("does nothing when Enter is pressed on a blank rename input", async () => {
    const user = userEvent.setup();
    const renameCategory = vi.fn();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ categories, renameCategory }));
    render(<CategoryManager onClose={vi.fn()} />);

    await user.click(screen.getAllByRole("button", { name: "Rename" })[0]);
    const input = screen.getByDisplayValue("Canned goods");
    await user.clear(input);
    await user.keyboard("{Enter}");
    expect(renameCategory).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when adding fails with a non-Error rejection", async () => {
    const user = userEvent.setup();
    const addCategory = vi.fn().mockRejectedValue("nope");
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ categories: [], addCategory }));
    render(<CategoryManager onClose={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("New category name"), "Drinks{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not add category.");
  });

  it("falls back to a generic message when renaming fails with a non-Error rejection", async () => {
    const user = userEvent.setup();
    const renameCategory = vi.fn().mockRejectedValue("nope");
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ categories, renameCategory }));
    render(<CategoryManager onClose={vi.fn()} />);

    await user.click(screen.getAllByRole("button", { name: "Rename" })[0]);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not rename category.");
  });

  it("falls back to a generic message when deleting fails with a non-Error rejection", async () => {
    const user = userEvent.setup();
    const removeCategory = vi.fn().mockRejectedValue("nope");
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ categories, removeCategory }));
    render(<CategoryManager onClose={vi.fn()} />);

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not delete category.");
  });

  it("renames a category via Enter key", async () => {
    const user = userEvent.setup();
    const renameCategory = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ categories, renameCategory }));
    render(<CategoryManager onClose={vi.fn()} />);

    await user.click(screen.getAllByRole("button", { name: "Rename" })[0]);
    const input = screen.getByDisplayValue("Canned goods");
    await user.type(input, "{Enter}");
    expect(renameCategory).toHaveBeenCalledWith("cat-1", "Canned goods");
  });
});
