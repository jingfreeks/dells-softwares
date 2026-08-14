import { ReportDetailModal } from "@/components";
import {
  PESO,
  printReport,
  LABEL_LOW_STOCK,
  LABEL_EST_COST_TO_REFILL,
  LABEL_STATUS_OUT_OF_STOCK,
  LABEL_STATUS_LOW_STOCK,
  TABLE_HEADER_PRODUCT,
  TABLE_HEADER_BARCODE,
  TABLE_HEADER_CATEGORY,
  TABLE_HEADER_STOCK,
  TABLE_HEADER_MIN_STOCK,
  TABLE_HEADER_STATUS,
  TABLE_HEADER_SUPPLIER,
  LABEL_NO_BARCODE,
  EMPTY_STATE_NO_LOW_STOCK,
} from "@/lib";
import type { RestockRow } from "../../hooks";

const ROW_COLUMNS = "minmax(0,1.7fr) 108px 118px 70px 70px 96px minmax(0,1fr)";

interface LowStockReportModalProps {
  dateLabel: string;
  storeName: string;
  storeAddress: string | null;
  printedByName: string;
  restockRows: RestockRow[];
  onClose: () => void;
}

export function LowStockReportModal({
  dateLabel,
  storeName,
  storeAddress,
  printedByName,
  restockRows,
  onClose,
}: LowStockReportModalProps) {
  const outOfStock = restockRows.filter((r) => r.isOut);
  const lowStock = restockRows.filter((r) => !r.isOut);
  const estCostToRefill = restockRows.reduce((sum, r) => {
    const quantity = r.suggestedQuantity ?? Math.max(0, r.minStock - r.stock);
    return sum + (r.cost ?? 0) * quantity;
  }, 0);
  const statusLabel = (row: RestockRow) => (row.isOut ? LABEL_STATUS_OUT_OF_STOCK : LABEL_STATUS_LOW_STOCK);

  function handlePrint() {
    printReport({
      storeName,
      storeAddress,
      title: LABEL_LOW_STOCK,
      subtitle: dateLabel,
      printedByName,
      summaryTiles: [
        { label: LABEL_STATUS_OUT_OF_STOCK, value: String(outOfStock.length) },
        { label: LABEL_STATUS_LOW_STOCK, value: String(lowStock.length) },
        { label: LABEL_EST_COST_TO_REFILL, value: PESO.format(estCostToRefill) },
      ],
      columns: [
        { header: TABLE_HEADER_PRODUCT },
        { header: TABLE_HEADER_BARCODE },
        { header: TABLE_HEADER_CATEGORY },
        { header: TABLE_HEADER_STOCK, align: "right" },
        { header: TABLE_HEADER_MIN_STOCK, align: "right" },
        { header: TABLE_HEADER_STATUS },
        { header: TABLE_HEADER_SUPPLIER },
      ],
      rows: restockRows.map((row) => [
        row.productName,
        row.barcode ?? LABEL_NO_BARCODE,
        row.category,
        String(row.stock),
        String(row.minStock),
        statusLabel(row),
        row.supplier ?? "",
      ]),
      emptyMessage: EMPTY_STATE_NO_LOW_STOCK,
    });
  }

  return (
    <ReportDetailModal
      title={LABEL_LOW_STOCK}
      subtitle={dateLabel}
      summaryTiles={[
        { label: LABEL_STATUS_OUT_OF_STOCK, value: String(outOfStock.length), variant: outOfStock.length > 0 ? "warn" : undefined },
        { label: LABEL_STATUS_LOW_STOCK, value: String(lowStock.length) },
        { label: LABEL_EST_COST_TO_REFILL, value: PESO.format(estCostToRefill) },
      ]}
      onClose={onClose}
      onPrint={handlePrint}
    >
      {restockRows.length === 0 ? (
        <p className="tpl-ts" style={{ padding: "24px 0", textAlign: "center" }}>
          {EMPTY_STATE_NO_LOW_STOCK}
        </p>
      ) : (
        <div className="tpl-card" style={{ padding: 0, minWidth: 830 }}>
          <div className="tpl-thead" style={{ gridTemplateColumns: ROW_COLUMNS }}>
            <span>{TABLE_HEADER_PRODUCT}</span>
            <span>{TABLE_HEADER_BARCODE}</span>
            <span>{TABLE_HEADER_CATEGORY}</span>
            <span>{TABLE_HEADER_STOCK}</span>
            <span>{TABLE_HEADER_MIN_STOCK}</span>
            <span>{TABLE_HEADER_STATUS}</span>
            <span>{TABLE_HEADER_SUPPLIER}</span>
          </div>
          {restockRows.map((row) => (
            <div
              key={row.productId}
              className={`tpl-trow${row.isOut ? " tpl-r" : " tpl-w"}`}
              style={{ gridTemplateColumns: ROW_COLUMNS, cursor: "default" }}
            >
              <p className="tpl-tp">{row.productName}</p>
              <span className="tpl-ts tpl-mono">{row.barcode ?? LABEL_NO_BARCODE}</span>
              <span className="tpl-ts">{row.category}</span>
              <span className="tpl-tp" style={{ textAlign: "right" }}>
                {row.stock}
              </span>
              <span className="tpl-ts" style={{ textAlign: "right" }}>
                {row.minStock}
              </span>
              <span className={`tpl-chip${row.isOut ? " tpl-bad" : " tpl-w"}`} style={{ justifyContent: "center", fontSize: 11 }}>
                {statusLabel(row)}
              </span>
              <span className="tpl-ts">{row.supplier ?? "—"}</span>
            </div>
          ))}
        </div>
      )}
    </ReportDetailModal>
  );
}
