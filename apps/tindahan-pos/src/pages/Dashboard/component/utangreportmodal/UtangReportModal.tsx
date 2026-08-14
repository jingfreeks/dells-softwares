import { ReportDetailModal } from "@/components";
import {
  PESO,
  printReport,
  computeOldestDebtDays,
  isOverdueDebt,
  latestTransactionForCustomer,
  LABEL_UTANG_OUTSTANDING,
  LABEL_CUSTOMERS_OWING,
  FILTER_OVERDUE_PREFIX,
  LABEL_STATUS_CURRENT,
  TABLE_HEADER_PHONE,
  TABLE_HEADER_BALANCE,
  TABLE_HEADER_LATEST_TRANSACTION,
  TABLE_HEADER_STATUS,
  EMPTY_STATE_NO_PHONE,
  EMPTY_STATE_NO_OUTSTANDING_UTANG,
} from "@/lib";
import type { Customer, SaleRecord } from "@/lib";

const ROW_COLUMNS = "minmax(0,1.4fr) 130px 110px 140px 100px";

interface UtangReportModalProps {
  dateLabel: string;
  storeName: string;
  storeAddress: string | null;
  printedByName: string;
  customers: Customer[];
  allSales: SaleRecord[];
  onClose: () => void;
}

export function UtangReportModal({
  dateLabel,
  storeName,
  storeAddress,
  printedByName,
  customers,
  allSales,
  onClose,
}: UtangReportModalProps) {
  const owing = customers.filter((c) => c.balance > 0);
  const total = owing.reduce((sum, c) => sum + c.balance, 0);

  function statusFor(customer: Customer): string {
    const days = computeOldestDebtDays(allSales, customer);
    return isOverdueDebt(days) ? FILTER_OVERDUE_PREFIX : LABEL_STATUS_CURRENT;
  }

  function latestLabel(customer: Customer): string {
    const latest = latestTransactionForCustomer(allSales, customer.id);
    if (!latest) return "—";
    return `${new Date(latest.date).toLocaleDateString("en-PH", { month: "short", day: "numeric" })} · ${PESO.format(latest.amount)}`;
  }

  function handlePrint() {
    printReport({
      storeName,
      storeAddress,
      title: LABEL_UTANG_OUTSTANDING,
      subtitle: dateLabel,
      printedByName,
      summaryTiles: [
        { label: LABEL_UTANG_OUTSTANDING, value: PESO.format(total) },
        { label: LABEL_CUSTOMERS_OWING, value: String(owing.length) },
      ],
      columns: [
        { header: "Customer" },
        { header: TABLE_HEADER_PHONE },
        { header: TABLE_HEADER_BALANCE, align: "right" },
        { header: TABLE_HEADER_LATEST_TRANSACTION },
        { header: TABLE_HEADER_STATUS },
      ],
      rows: owing.map((c) => [c.name, c.phone ?? EMPTY_STATE_NO_PHONE, PESO.format(c.balance), latestLabel(c), statusFor(c)]),
      emptyMessage: EMPTY_STATE_NO_OUTSTANDING_UTANG,
    });
  }

  return (
    <ReportDetailModal
      title={LABEL_UTANG_OUTSTANDING}
      subtitle={dateLabel}
      summaryTiles={[
        { label: LABEL_UTANG_OUTSTANDING, value: PESO.format(total) },
        { label: LABEL_CUSTOMERS_OWING, value: String(owing.length) },
      ]}
      onClose={onClose}
      onPrint={handlePrint}
    >
      {owing.length === 0 ? (
        <p className="tpl-ts" style={{ padding: "24px 0", textAlign: "center" }}>
          {EMPTY_STATE_NO_OUTSTANDING_UTANG}
        </p>
      ) : (
        <div className="tpl-card" style={{ padding: 0, minWidth: 700 }}>
          <div className="tpl-thead" style={{ gridTemplateColumns: ROW_COLUMNS }}>
            <span>Customer</span>
            <span>{TABLE_HEADER_PHONE}</span>
            <span>{TABLE_HEADER_BALANCE}</span>
            <span>{TABLE_HEADER_LATEST_TRANSACTION}</span>
            <span>{TABLE_HEADER_STATUS}</span>
          </div>
          {owing.map((customer) => {
            const status = statusFor(customer);
            return (
              <div key={customer.id} className="tpl-trow" style={{ gridTemplateColumns: ROW_COLUMNS, cursor: "default" }}>
                <p className="tpl-tp">{customer.name}</p>
                <span className="tpl-ts">{customer.phone ?? EMPTY_STATE_NO_PHONE}</span>
                <span className="tpl-tp" style={{ textAlign: "right" }}>
                  {PESO.format(customer.balance)}
                </span>
                <span className="tpl-ts">{latestLabel(customer)}</span>
                <span className={`tpl-chip${status === FILTER_OVERDUE_PREFIX ? " tpl-bad" : ""}`} style={{ fontSize: 11 }}>
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </ReportDetailModal>
  );
}
