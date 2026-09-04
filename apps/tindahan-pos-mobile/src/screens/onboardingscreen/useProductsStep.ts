import { useMemo, useState } from "react";
import { useStoreData } from "../../lib/storeData";
import { DEFAULT_LOW_STOCK_THRESHOLD, STARTER_CATALOG } from "../../lib/onboarding";
import { pickCsvFileText } from "../../lib/documentPicker";
import { parseProductsCsv } from "../../lib/csv";
import type { Category } from "../../lib/types";
import { EMPTY_QUICK_ADD_FORM, type QuickAddForm } from "../onboarding/quickaddproductmodal";

const UNCATEGORIZED = "Uncategorized";

/**
 * The onboarding wizard's products step: the starter catalogue, a CSV import,
 * and the quick-add form behind the barcode scanner.
 *
 * Mirrors the web app's Onboarding/useProductsStep.ts, which is the largest of
 * that wizard's step hooks for the same reason -- three ways to create a
 * product, each with its own in-flight and error state.
 *
 * resolveCategoryId comes with them rather than staying behind: all three
 * paths need it and nothing else does, so it belongs to this step.
 */
export function useProductsStep() {
  const { categories, addCategory, addProduct } = useStoreData();

  const [enabledCategoryKeys, setEnabledCategoryKeys] = useState<Set<string>>(
    () => new Set(STARTER_CATALOG.map((c) => c.key))
  );
  const [importingStarter, setImportingStarter] = useState(false);
  const [starterError, setStarterError] = useState<string | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState<QuickAddForm>(EMPTY_QUICK_ADD_FORM);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);
  const [savingQuickAdd, setSavingQuickAdd] = useState(false);

  const starterItemsToAdd = useMemo(
    () => STARTER_CATALOG.filter((c) => enabledCategoryKeys.has(c.key)).flatMap((c) => c.items),
    [enabledCategoryKeys]
  );

  async function resolveCategoryId(categoryName: string): Promise<string> {
    const existing = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
    if (existing) return existing.id;
    const created: Category = await addCategory(categoryName);
    return created.id;
  }

  async function handleImportStarterCatalog() {
    setImportingStarter(true);
    setStarterError(null);
    try {
      const categoriesToImport = STARTER_CATALOG.filter((c) => enabledCategoryKeys.has(c.key));
      for (const category of categoriesToImport) {
        const categoryId = await resolveCategoryId(category.label);
        for (const item of category.items) {
          await addProduct({
            barcode: null,
            name: item.name,
            price: item.price,
            stock: 0,
            lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
            categoryId,
            packQuantity: null,
            packPrice: null,
            imageUrl: null,
          });
        }
      }
    } catch (err) {
      setStarterError(err instanceof Error ? err.message : "Could not import the starter list.");
    } finally {
      setImportingStarter(false);
    }
  }

  async function handleImportCsv() {
    setImportingCsv(true);
    setCsvError(null);
    try {
      const text = await pickCsvFileText();
      if (text === null) return; // user cancelled
      const { rows, error } = parseProductsCsv(text);
      if (error === "empty") {
        setCsvError("That file doesn't have any product rows.");
        return;
      }
      if (error === "missing-columns") {
        setCsvError("The file needs at least a name and price column.");
        return;
      }
      for (const row of rows) {
        const categoryId = await resolveCategoryId(row.category ?? UNCATEGORIZED);
        await addProduct({
          barcode: row.barcode,
          name: row.name,
          price: row.price,
          stock: 0,
          lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
          categoryId,
          packQuantity: null,
          packPrice: null,
          imageUrl: null,
        });
      }
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : "Could not import that file.");
    } finally {
      setImportingCsv(false);
    }
  }

  function handleScannedBarcode(code: string) {
    setShowQuickAdd(true);
    setQuickAddForm({ ...EMPTY_QUICK_ADD_FORM, barcode: code });
  }

  async function handleQuickAddSubmit() {
    const trimmedName = quickAddForm.name.trim();
    const price = Number(quickAddForm.price);
    if (!trimmedName) {
      setQuickAddError("Name is required.");
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setQuickAddError("Enter a valid price.");
      return;
    }
    setSavingQuickAdd(true);
    setQuickAddError(null);
    try {
      const categoryId = await resolveCategoryId(UNCATEGORIZED);
      await addProduct({
        barcode: quickAddForm.barcode.trim() || null,
        name: trimmedName,
        price,
        stock: 0,
        lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
        categoryId,
        packQuantity: null,
        packPrice: null,
        imageUrl: null,
      });
      setQuickAddForm(EMPTY_QUICK_ADD_FORM);
      setShowQuickAdd(false);
    } catch (err) {
      setQuickAddError(err instanceof Error ? err.message : "Could not add product.");
    } finally {
      setSavingQuickAdd(false);
    }
  }
  return {
    enabledCategoryKeys,
    setEnabledCategoryKeys,
    starterItemsToAdd,
    importingStarter,
    starterError,
    handleImportStarterCatalog,
    importingCsv,
    csvError,
    handleImportCsv,
    showQuickAdd,
    setShowQuickAdd,
    quickAddForm,
    setQuickAddForm,
    quickAddError,
    savingQuickAdd,
    handleQuickAddSubmit,
    handleScannedBarcode,
  };
}
