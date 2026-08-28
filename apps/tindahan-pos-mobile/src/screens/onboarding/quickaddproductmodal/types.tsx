export interface QuickAddForm {
  name: string;
  price: string;
  barcode: string;
}

export const EMPTY_QUICK_ADD_FORM: QuickAddForm = { name: "", price: "", barcode: "" };

export interface QuickAddProductModalProps {
  form: QuickAddForm;
  onFormChange: (form: QuickAddForm) => void;
  error: string | null;
  saving: boolean;
  onSubmit: () => void;
  onClose: () => void;
}
