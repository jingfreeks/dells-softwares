import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import {
  useAuth,
  useStoreData,
  supabase,
  uploadImage,
  validateAndOptimizeImage,
  useFeatureFlag,
  ERROR_COULD_NOT_PROCESS_IMAGE,
  ERROR_COULD_NOT_ADD_CATEGORY,
  ERROR_PRODUCT_NAME_REQUIRED,
  ERROR_STOCK_INVALID,
  ERROR_CHOOSE_A_CATEGORY,
  ERROR_BARCODE_ALREADY_USED_PREFIX,
  ERROR_PACK_SIZE_INVALID,
  ERROR_PACK_PRICE_INVALID,
  ERROR_PRICE_INVALID,
  ERROR_COULD_NOT_SAVE_PRODUCT,
  ERROR_COULD_NOT_RESTOCK_PRODUCT,
  ERROR_COULD_NOT_REMOVE_PRODUCT,
  type Product,
} from "@/lib";
import { buildBarcodeIndex, findDuplicateBarcodeFast, lowStockProducts, packUnitPrice, stockStatus } from "@/lib/inventory";
import { averageMarginPercent, computeDailySalesRates, lastStockInLabel, stockValueAtCost } from "./lib";

const PRODUCT_IMAGE_MAX_DIMENSION = 800;
export const PAGE_SIZE = 20;

const emptyForm = {
  name: "",
  barcode: "",
  price: "0",
  stock: "0",
  lowStockThreshold: "5",
  categoryId: "",
  packEnabled: false,
  packQuantity: "0",
  packPrice: "0",
};

export const NEW_CATEGORY_VALUE = "__new__";

export function useInventoryPage() {
  const { user } = useAuth();
  const {
    products,
    sales,
    categories,
    receivingHistory,
    loading,
    error,
    addProduct,
    updateProduct,
    removeProduct,
    restock,
    addCategory,
  } = useStoreData();
  const packPricingEnabled = useFeatureFlag("pack_pricing");
  const location = useLocation();
  const [query, setQuery] = useState(
    () => (location.state as { initialQuery?: string } | null)?.initialQuery ?? ""
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [needsAttentionOnly, setNeedsAttentionOnly] = useState(false);
  const [sortByRunsOutSoonest, setSortByRunsOutSoonest] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [duplicateProduct, setDuplicateProduct] = useState<Product | null>(null);
  const [page, setPage] = useState(1);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // The topbar's quick search navigates here with a query in
  // location.state rather than a URL param, so a second search from the
  // dashboard while already on this page (same route, new state) needs
  // its own effect — the useState initializer above only runs once, on
  // mount.
  useEffect(() => {
    const initialQuery = (location.state as { initialQuery?: string } | null)?.initialQuery;
    if (initialQuery) {
      setQuery(initialQuery);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const lowStock = useMemo(() => lowStockProducts(products), [products]);

  const dailySalesRateById = useMemo(() => computeDailySalesRates(products, sales), [products, sales]);
  const avgMarginPercent = useMemo(() => averageMarginPercent(products, receivingHistory), [products, receivingHistory]);
  const stockValue = useMemo(() => stockValueAtCost(products, receivingHistory), [products, receivingHistory]);
  const lastStockIn = useMemo(() => lastStockInLabel(receivingHistory), [receivingHistory]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = products.filter((p) => {
      const matchesCategory = categoryFilter === "All" || p.category === categoryFilter;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.barcode ?? "").includes(q);
      return matchesCategory && matchesQuery;
    });
    if (needsAttentionOnly) {
      rows = rows.filter((p) => stockStatus(p) !== "in-stock");
    }
    if (sortByRunsOutSoonest) {
      rows = [...rows].sort((a, b) => {
        const aDays = dailySalesRateById.get(a.id) ? a.stock / dailySalesRateById.get(a.id)! : Infinity;
        const bDays = dailySalesRateById.get(b.id) ? b.stock / dailySalesRateById.get(b.id)! : Infinity;
        return aDays - bDays;
      });
    }
    return rows;
  }, [products, query, categoryFilter, needsAttentionOnly, sortByRunsOutSoonest, dailySalesRateById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageProducts = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const packQuantityNum = Number(form.packQuantity);
  const packPriceNum = Number(form.packPrice);
  const packPreview =
    form.packEnabled && packQuantityNum >= 2 && !Number.isNaN(packPriceNum) && packPriceNum >= 0
      ? packUnitPrice(packQuantityNum, packPriceNum)
      : null;

  // Memoized so the barcode field's onChange (fires on every keystroke)
  // does an O(1) map lookup instead of an O(n) scan over all products.
  const barcodeIndex = useMemo(() => buildBarcodeIndex(products), [products]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  function handleCategoryFilterChange(value: string) {
    setCategoryFilter(value);
    setPage(1);
  }

  function checkDuplicateBarcode(barcode: string) {
    setDuplicateProduct(findDuplicateBarcodeFast(barcodeIndex, barcode, editingId));
  }

  function resetImageState(existingUrl: string | null) {
    setImageBlob(null);
    setImagePreview(null);
    setExistingImageUrl(existingUrl);
    setRemoveImage(false);
    setImageError(null);
  }

  function openAddForm() {
    setEditingId(null);
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? "" });
    setAddingCategory(false);
    setFormError(null);
    setDuplicateProduct(null);
    resetImageState(null);
    setShowForm(true);
  }

  function openEditForm(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      barcode: product.barcode ?? "",
      price: String(product.price),
      stock: String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold),
      categoryId: product.categoryId,
      packEnabled: product.packQuantity != null,
      packQuantity: product.packQuantity != null ? String(product.packQuantity) : "",
      packPrice: product.packPrice != null ? String(product.packPrice) : "",
    });
    setAddingCategory(false);
    setFormError(null);
    setDuplicateProduct(null);
    resetImageState(product.imageUrl);
    setShowForm(true);
  }

  async function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError(null);
    setProcessingImage(true);
    try {
      const blob = await validateAndOptimizeImage(file, { maxDimension: PRODUCT_IMAGE_MAX_DIMENSION });
      setImageBlob(blob);
      setRemoveImage(false);
      setImagePreview(URL.createObjectURL(blob));
    } catch (err) {
      setImageError(err instanceof Error ? err.message : ERROR_COULD_NOT_PROCESS_IMAGE);
    } finally {
      setProcessingImage(false);
    }
  }

  function handleRemoveImage() {
    setImageBlob(null);
    setImagePreview(null);
    setRemoveImage(true);
  }

  function handleCategorySelect(value: string) {
    if (value === NEW_CATEGORY_VALUE) {
      setAddingCategory(true);
      setNewCategoryName("");
    } else {
      setForm((f) => ({ ...f, categoryId: value }));
    }
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    setFormError(null);
    try {
      const category = await addCategory(newCategoryName);
      setForm((f) => ({ ...f, categoryId: category.id }));
      setAddingCategory(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : ERROR_COULD_NOT_ADD_CATEGORY);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const stock = Number(form.stock);
    const lowStockThreshold = Number(form.lowStockThreshold);

    if (!form.name.trim()) {
      setFormError(ERROR_PRODUCT_NAME_REQUIRED);
      return;
    }
    if (Number.isNaN(stock) || stock < 0) {
      setFormError(ERROR_STOCK_INVALID);
      return;
    }
    if (!form.categoryId) {
      setFormError(ERROR_CHOOSE_A_CATEGORY);
      return;
    }
    if (duplicateProduct) {
      setFormError(`${ERROR_BARCODE_ALREADY_USED_PREFIX} "${duplicateProduct.name}".`);
      return;
    }

    let price: number;
    let packQuantity: number | null = null;
    let packPrice: number | null = null;

    if (form.packEnabled && packPricingEnabled) {
      packQuantity = Number(form.packQuantity);
      packPrice = Number(form.packPrice);
      if (!Number.isInteger(packQuantity) || packQuantity < 2) {
        setFormError(ERROR_PACK_SIZE_INVALID);
        return;
      }
      if (Number.isNaN(packPrice) || packPrice < 0) {
        setFormError(ERROR_PACK_PRICE_INVALID);
        return;
      }
      price = packUnitPrice(packQuantity, packPrice);
    } else {
      price = Number(form.price);
      if (form.price.trim() === "" || Number.isNaN(price) || price < 0) {
        setFormError(ERROR_PRICE_INVALID);
        return;
      }
    }

    const payload = {
      name: form.name.trim(),
      barcode: form.barcode.trim() || null,
      price,
      stock,
      lowStockThreshold: Number.isNaN(lowStockThreshold) ? 5 : lowStockThreshold,
      categoryId: form.categoryId,
      packQuantity,
      packPrice,
    };

    setSubmitting(true);
    setFormError(null);
    try {
      let productId = editingId;
      if (editingId) {
        await updateProduct(editingId, payload);
      } else {
        const created = await addProduct({ ...payload, imageUrl: null });
        productId = created.id;
      }

      if (imageBlob && productId && user) {
        const path = `${user.storeId}/${productId}/image.webp`;
        const imageUrl = await uploadImage(supabase, "product-images", path, imageBlob);
        await updateProduct(productId, { imageUrl });
      } else if (removeImage && productId) {
        await updateProduct(productId, { imageUrl: null });
      }

      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : ERROR_COULD_NOT_SAVE_PRODUCT);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRestock(id: string) {
    setActionError(null);
    try {
      await restock(id, 10);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : ERROR_COULD_NOT_RESTOCK_PRODUCT);
    }
  }

  async function handleRemove(id: string) {
    setActionError(null);
    try {
      await removeProduct(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : ERROR_COULD_NOT_REMOVE_PRODUCT);
    }
  }

  return {
    products,
    categories,
    receivingHistory,
    loading,
    error,
    actionError,
    packPricingEnabled,
    query,
    categoryFilter,
    showForm,
    showCategoryManager,
    setShowCategoryManager,
    editingId,
    form,
    setForm,
    addingCategory,
    setAddingCategory,
    newCategoryName,
    setNewCategoryName,
    formError,
    submitting,
    showScanner,
    setShowScanner,
    duplicateProduct,
    page,
    setPage,
    imagePreview,
    existingImageUrl,
    removeImage,
    imageError,
    processingImage,
    lowStock,
    filtered,
    totalPages,
    currentPage,
    pageProducts,
    packPreview,
    needsAttentionOnly,
    setNeedsAttentionOnly,
    sortByRunsOutSoonest,
    setSortByRunsOutSoonest,
    dailySalesRateById,
    avgMarginPercent,
    stockValue,
    lastStockIn,
    handleQueryChange,
    handleCategoryFilterChange,
    checkDuplicateBarcode,
    openAddForm,
    openEditForm,
    setShowForm,
    handleImageSelect,
    handleRemoveImage,
    handleCategorySelect,
    handleCreateCategory,
    handleSubmit,
    handleRestock,
    handleRemove,
  };
}
