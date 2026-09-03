import { useState, type ChangeEvent } from "react";
import {
  useStoreData,
  ERROR_NAME_REQUIRED,
  ERROR_INVALID_PRICE,
  ERROR_COULD_NOT_ADD_PRODUCT,
  ERROR_COULD_NOT_IMPORT_STARTER_CATALOG,
  ERROR_CSV_EMPTY,
  ERROR_CSV_MISSING_COLUMNS,
  ERROR_COULD_NOT_IMPORT_FILE, describePlatformError } from "@/lib";
import type { Category } from "@/lib/types";
import { STARTER_CATALOG } from "./starterCatalog";
import { parseProductsCsv } from "./lib";

const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export interface QuickAddForm {
  name: string;
  price: string;
  barcode: string;
}

const EMPTY_QUICK_ADD_FORM: QuickAddForm = { name: "", price: "", barcode: "" };

export function useProductsStep() {
  const { products, categories, addProduct, addCategory } = useStoreData();

  const [enabledCategoryKeys, setEnabledCategoryKeys] = useState<Set<string>>(
    () => new Set(STARTER_CATALOG.map((c) => c.key))
  );
  const [importingStarter, setImportingStarter] = useState(false);
  const [starterError, setStarterError] = useState<string | null>(null);

  const [showScanner, setShowScanner] = useState(false);

  const [csvError, setCsvError] = useState<string | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);

  const [quickAddForm, setQuickAddForm] = useState<QuickAddForm>(EMPTY_QUICK_ADD_FORM);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);
  const [savingQuickAdd, setSavingQuickAdd] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  function toggleStarterCategory(key: string) {
    setEnabledCategoryKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function resolveCategoryId(name: string): Promise<string> {
    const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;
    const created: Category = await addCategory(name);
    return created.id;
  }

  const starterItemsToAdd = STARTER_CATALOG.filter((c) => enabledCategoryKeys.has(c.key)).flatMap(
    (c) => c.items
  );

  async function importStarterCatalog() {
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
            cost: null,
          });
        }
      }
    } catch (err) {
      setStarterError(describePlatformError(err, ERROR_COULD_NOT_IMPORT_STARTER_CATALOG));
    } finally {
      setImportingStarter(false);
    }
  }

  function handleScannedBarcode(code: string) {
    setShowScanner(false);
    setShowQuickAdd(true);
    setQuickAddForm({ ...EMPTY_QUICK_ADD_FORM, barcode: code });
  }

  async function handleCsvFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCsvError(null);
    setImportingCsv(true);
    try {
      const text = await file.text();
      const { rows, error } = parseProductsCsv(text);
      if (error === "empty") {
        setCsvError(ERROR_CSV_EMPTY);
        return;
      }
      if (error === "missing-columns") {
        setCsvError(ERROR_CSV_MISSING_COLUMNS);
        return;
      }
      for (const row of rows) {
        const categoryId = await resolveCategoryId(row.category ?? "Uncategorized");
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
          cost: null,
        });
      }
    } catch {
      setCsvError(ERROR_COULD_NOT_IMPORT_FILE);
    } finally {
      setImportingCsv(false);
    }
  }

  async function submitQuickAdd() {
    const name = quickAddForm.name.trim();
    const price = Number(quickAddForm.price);
    if (!name) {
      setQuickAddError(ERROR_NAME_REQUIRED);
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setQuickAddError(ERROR_INVALID_PRICE);
      return;
    }
    setSavingQuickAdd(true);
    setQuickAddError(null);
    try {
      const categoryId = await resolveCategoryId("Uncategorized");
      await addProduct({
        barcode: quickAddForm.barcode.trim() || null,
        name,
        price,
        stock: 0,
        lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
        categoryId,
        packQuantity: null,
        packPrice: null,
        imageUrl: null,
        cost: null,
      });
      setQuickAddForm(EMPTY_QUICK_ADD_FORM);
    } catch (err) {
      setQuickAddError(describePlatformError(err, ERROR_COULD_NOT_ADD_PRODUCT));
    } finally {
      setSavingQuickAdd(false);
    }
  }

  return {
    products,
    starterCatalog: STARTER_CATALOG,
    enabledCategoryKeys,
    toggleStarterCategory,
    starterItemsToAddCount: starterItemsToAdd.length,
    importingStarter,
    starterError,
    onImportStarterCatalog: importStarterCatalog,

    showScanner,
    setShowScanner,
    onScannedBarcode: handleScannedBarcode,

    csvError,
    importingCsv,
    onCsvFile: handleCsvFile,

    showQuickAdd,
    setShowQuickAdd,
    quickAddForm,
    setQuickAddForm,
    quickAddError,
    savingQuickAdd,
    onQuickAddSubmit: submitQuickAdd,
  };
}
