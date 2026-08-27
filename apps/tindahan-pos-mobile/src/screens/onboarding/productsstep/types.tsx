import type { Product } from "../../../lib/types";
import type { QuickAddForm } from "../QuickAddProductModal";

export interface ProductsStepProps {
  products: Product[];
  enabledCategoryKeys: Set<string>;
  onToggleCategory: (key: string) => void;
  starterItemsToAddCount: number;
  importingStarter: boolean;
  starterError: string | null;
  onImportStarterCatalog: () => void;
  onScannedBarcode: (barcode: string) => void;
  importingCsv: boolean;
  csvError: string | null;
  onImportCsv: () => void;
  quickAddForm: QuickAddForm;
  onQuickAddFormChange: (form: QuickAddForm) => void;
  quickAddError: string | null;
  savingQuickAdd: boolean;
  onQuickAddSubmit: () => void;
  showQuickAdd: boolean;
  onShowQuickAddChange: (visible: boolean) => void;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
}
