import type { Supplier } from "@/lib";
import {
  LABEL_SUPPLIER_OPTIONAL,
  PLACEHOLDER_SUPPLIER_NAME,
  ARIA_SCAN_SUPPLIER_CODE,
  ARIA_PICK_SAVED_SUPPLIER,
  LABEL_PICK_SAVED_SUPPLIER,
  LABEL_DATE,
  LABEL_DR_NUMBER_OPTIONAL,
  PLACEHOLDER_DR_NUMBER,
} from "@/lib";

interface SupplierAndDateFieldsProps {
  suppliers: Supplier[];
  supplier: string;
  supplierId: string | null;
  drNumber: string;
  date: string;
  onSupplierNameChange: (value: string) => void;
  onSupplierPick: (id: string) => void;
  onScanSupplier: () => void;
  onDrNumberChange: (value: string) => void;
  onDateChange: (value: string) => void;
}

export function SupplierAndDateFields({
  suppliers,
  supplier,
  supplierId,
  drNumber,
  date,
  onSupplierNameChange,
  onSupplierPick,
  onScanSupplier,
  onDrNumberChange,
  onDateChange,
}: SupplierAndDateFieldsProps) {
  return (
    <div className="tpl-g3">
      <div>
        <label htmlFor="supplier" className="tpl-lbl">
          {LABEL_SUPPLIER_OPTIONAL}
        </label>
        <div className="tpl-sp" style={{ gap: 8 }}>
          <div className="tpl-fld" style={{ flex: 1 }}>
            <input
              id="supplier"
              type="text"
              value={supplier}
              onChange={(e) => onSupplierNameChange(e.target.value)}
              placeholder={PLACEHOLDER_SUPPLIER_NAME}
            />
          </div>
          <button
            type="button"
            onClick={onScanSupplier}
            aria-label={ARIA_SCAN_SUPPLIER_CODE}
            title={ARIA_SCAN_SUPPLIER_CODE}
            className="tpl-btn"
            style={{ width: 38, height: 38, padding: 0, marginBottom: 0, flexShrink: 0 }}
          >
            <i className="ti ti-barcode" aria-hidden />
          </button>
        </div>
        {suppliers.length > 0 && (
          <div className="tpl-fld" style={{ marginTop: 6 }}>
            <select aria-label={ARIA_PICK_SAVED_SUPPLIER} value={supplierId ?? ""} onChange={(e) => onSupplierPick(e.target.value)}>
              <option value="">{LABEL_PICK_SAVED_SUPPLIER}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div>
        <label htmlFor="recvDr" className="tpl-lbl">
          {LABEL_DR_NUMBER_OPTIONAL}
        </label>
        <div className="tpl-fld">
          <input
            id="recvDr"
            type="text"
            className="tpl-mono"
            placeholder={PLACEHOLDER_DR_NUMBER}
            value={drNumber}
            onChange={(e) => onDrNumberChange(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label htmlFor="recvDate" className="tpl-lbl">
          {LABEL_DATE}
        </label>
        <div className="tpl-fld">
          <input id="recvDate" type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />
        </div>
      </div>
    </div>
  );
}
