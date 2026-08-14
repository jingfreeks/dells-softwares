import {
  TITLE_PRINT_SCAN_SHEET,
  TEXT_PRINT_SCAN_SHEET_BODY,
  BUTTON_PRINT_ALL_CODES_PREFIX,
} from "@/lib";

interface SupplierPrintSheetCardProps {
  supplierCount: number;
  onPrint: () => void;
}

export function SupplierPrintSheetCard({ supplierCount, onPrint }: SupplierPrintSheetCardProps) {
  return (
    <div className="tpl-note tpl-b">
      <i className="ti ti-printer tpl-acc" aria-hidden />
      <div className="tpl-flex1">
        <p className="tpl-nt" style={{ color: "var(--tpl-a4)" }}>
          {TITLE_PRINT_SCAN_SHEET}
        </p>
        <p className="tpl-ns">{TEXT_PRINT_SCAN_SHEET_BODY}</p>
      </div>
      <span
        role="button"
        tabIndex={0}
        className="tpl-btnp"
        style={{ alignSelf: "center", width: "auto", height: 34, padding: "0 14px", marginBottom: 0 }}
        onClick={onPrint}
        onKeyDown={(e) => e.key === "Enter" && onPrint()}
      >
        {BUTTON_PRINT_ALL_CODES_PREFIX} {supplierCount}
      </span>
    </div>
  );
}
