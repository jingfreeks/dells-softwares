import { Link } from "react-router-dom";
import { ReportDetailModal } from "@/components";
import {
  printReport,
  LABEL_NEEDS_RESTOCKING,
  LABEL_STATUS_OUT_OF_STOCK,
  LABEL_STATUS_LOW_STOCK,
  TABLE_HEADER_PRODUCT,
  TABLE_HEADER_BARCODE,
  TABLE_HEADER_CATEGORY,
  TABLE_HEADER_STOCK,
  TABLE_HEADER_MIN_STOCK,
  TABLE_HEADER_SUGGESTED_QTY,
  TABLE_HEADER_SUPPLIER,
  TABLE_HEADER_STATUS,
  LABEL_NO_BARCODE,
  LINK_RECEIVE,
  EMPTY_STATE_NO_RESTOCKING_NEEDED,
} from "@/lib";
import type { RestockRow } from "../../hooks";

const ROW_COLUMNS = "minmax(0,1.4fr) 100px 110px 70px 70px 90px minmax(0,1fr) 96px";

interface RestockingReportModalProps {
  dateLabel: string;
  storeName: string;
  storeAddress: string | null;
  printedByName: string;
  restockRows: RestockRow[];
  onClose: () => void;
}

export function RestockingReportModal({
  dateLabel,
  storeName,
  storeAddress,
  printedByName,
  restockRows,
  onClose,
}: RestockingReportModalProps) {
  const statusLabel = (row: RestockRow) => (row.isOut ? LABEL_STATUS_OUT_OF_STOCK : LABEL_STATUS_LOW_STOCK);

  function handlePrint() {
    printReport({
      storeName,
      storeAddress,
      title: LABEL_NEEDS_RESTOCKING,
      subtitle: dateLabel,
      printedByName,
      columns: [
        { header: TABLE_HEADER_PRODUCT },
        { header: TABLE_HEADER_BARCODE },
        { header: TABLE_HEADER_CATEGORY },
        { header: TABLE_HEADER_STOCK, align: "right" },
        { header: TABLE_HEADER_MIN_STOCK, align: "right" },
        { header: TABLE_HEADER_SUGGESTED_QTY, align: "right" },
        { header: TABLE_HEADER_SUPPLIER },
        { header: TABLE_HEADER_STATUS },
      ],
      rows: restockRows.map((row) => [
        row.productName,
        row.barcode ?? LABEL_NO_BARCODE,
        row.category,
        String(row.stock),
        String(row.minStock),
        row.suggestedQuantity !== null ? String(row.suggestedQuantity) : "—",
        row.supplier ?? "",
        statusLabel(row),
      ]),
      emptyMessage: EMPTY_STATE_NO_RESTOCKING_NEEDED,
    });
  }

  return (
    <ReportDetailModal title={LABEL_NEEDS_RESTOCKING} subtitle={dateLabel} onClose={onClose} onPrint={handlePrint}>
      {restockRows.length === 0 ? (
        <p className="tpl-ts" style={{ padding: "24px 0", textAlign: "center" }}>
          {EMPTY_STATE_NO_RESTOCKING_NEEDED}
        </p>
      ) : (
        <div className="tpl-card" style={{ padding: 0, minWidth: 880 }}>
          <div className="tpl-thead" style={{ gridTemplateColumns: ROW_COLUMNS }}>
            <span>{TABLE_HEADER_PRODUCT}</span>
            <span>{TABLE_HEADER_BARCODE}</span>
            <span>{TABLE_HEADER_CATEGORY}</span>
            <span>{TABLE_HEADER_STOCK}</span>
            <span>{TABLE_HEADER_MIN_STOCK}</span>
            <span>{TABLE_HEADER_SUGGESTED_QTY}</span>
            <span>{TABLE_HEADER_SUPPLIER}</span>
            <span />
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
              <span className="tpl-ts" style={{ textAlign: "right" }}>
                {row.suggestedQuantity ?? "—"}
              </span>
              <span className="tpl-ts">{row.supplier ?? "—"}</span>
              <Link
                to="/inventory/receiving"
                state={{ prefillProduct: { productId: row.productId, productName: row.productName, quantity: 1 } }}
                className="tpl-chip tpl-on"
                style={{ textDecoration: "none" }}
              >
                {LINK_RECEIVE}
              </Link>
            </div>
          ))}
        </div>
      )}
    </ReportDetailModal>
  );
}
