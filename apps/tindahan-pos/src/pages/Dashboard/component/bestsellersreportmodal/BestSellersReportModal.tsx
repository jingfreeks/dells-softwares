import { ReportDetailModal } from "@/components";
import {
  PESO,
  printReport,
  LABEL_BEST_SELLERS,
  TABLE_HEADER_RANK,
  TABLE_HEADER_PRODUCT,
  TABLE_HEADER_BARCODE,
  TABLE_HEADER_CATEGORY,
  TABLE_HEADER_UNITS_SOLD,
  LABEL_TRANSACTIONS,
  TABLE_HEADER_REVENUE,
  LABEL_NO_BARCODE,
  EMPTY_STATE_NO_DATA,
} from "@/lib";
import type { BestSeller } from "@/lib";

const ROW_COLUMNS = "56px minmax(0,1.6fr) 120px 140px 100px 110px 110px";

interface BestSellersReportModalProps {
  dateLabel: string;
  storeName: string;
  storeAddress: string | null;
  printedByName: string;
  bestSellers: BestSeller[];
  onClose: () => void;
}

export function BestSellersReportModal({
  dateLabel,
  storeName,
  storeAddress,
  printedByName,
  bestSellers,
  onClose,
}: BestSellersReportModalProps) {
  function handlePrint() {
    printReport({
      storeName,
      storeAddress,
      title: LABEL_BEST_SELLERS,
      subtitle: dateLabel,
      printedByName,
      columns: [
        { header: TABLE_HEADER_RANK, align: "right" },
        { header: TABLE_HEADER_PRODUCT },
        { header: TABLE_HEADER_BARCODE },
        { header: TABLE_HEADER_CATEGORY },
        { header: TABLE_HEADER_UNITS_SOLD, align: "right" },
        { header: LABEL_TRANSACTIONS, align: "right" },
        { header: TABLE_HEADER_REVENUE, align: "right" },
      ],
      rows: bestSellers.map((b, i) => [
        String(i + 1),
        b.name,
        b.barcode ?? LABEL_NO_BARCODE,
        b.category,
        String(b.quantity),
        String(b.transactionCount),
        PESO.format(b.revenue),
      ]),
      emptyMessage: EMPTY_STATE_NO_DATA,
    });
  }

  return (
    <ReportDetailModal title={LABEL_BEST_SELLERS} subtitle={dateLabel} onClose={onClose} onPrint={handlePrint}>
      {bestSellers.length === 0 ? (
        <p className="tpl-ts" style={{ padding: "24px 0", textAlign: "center" }}>
          {EMPTY_STATE_NO_DATA}
        </p>
      ) : (
        <div className="tpl-card" style={{ padding: 0, minWidth: 850 }}>
          <div className="tpl-thead" style={{ gridTemplateColumns: ROW_COLUMNS }}>
            <span>{TABLE_HEADER_RANK}</span>
            <span>{TABLE_HEADER_PRODUCT}</span>
            <span>{TABLE_HEADER_BARCODE}</span>
            <span>{TABLE_HEADER_CATEGORY}</span>
            <span>{TABLE_HEADER_UNITS_SOLD}</span>
            <span>{LABEL_TRANSACTIONS}</span>
            <span>{TABLE_HEADER_REVENUE}</span>
          </div>
          {bestSellers.map((b, i) => (
            <div key={b.productId} className="tpl-trow" style={{ gridTemplateColumns: ROW_COLUMNS, cursor: "default" }}>
              <span className="tpl-ts">{i + 1}</span>
              <p className="tpl-tp">{b.name}</p>
              <span className="tpl-ts tpl-mono">{b.barcode ?? LABEL_NO_BARCODE}</span>
              <span className="tpl-ts">{b.category}</span>
              <span className="tpl-tp" style={{ textAlign: "right" }}>
                {b.quantity}
              </span>
              <span className="tpl-ts" style={{ textAlign: "right" }}>
                {b.transactionCount}
              </span>
              <span className="tpl-tp" style={{ textAlign: "right" }}>
                {PESO.format(b.revenue)}
              </span>
            </div>
          ))}
        </div>
      )}
    </ReportDetailModal>
  );
}
