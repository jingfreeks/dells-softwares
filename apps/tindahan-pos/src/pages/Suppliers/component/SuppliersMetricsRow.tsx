import type { Supplier } from "@/lib";
import {
  PESO,
  isoWeekday,
  LABEL_SPENT_THIS_MONTH,
  TEXT_ACROSS_SUPPLIERS_SUFFIX,
  LABEL_DELIVERIES,
  TEXT_AVERAGE_SUFFIX,
  LABEL_UNPAID_ON_TERMS,
  TEXT_DUE_PREFIX,
  TEXT_NOTHING_OWED,
  LABEL_NEXT_EXPECTED,
  TEXT_NO_UPCOMING_DELIVERY,
  DAY_MON,
  DAY_TUE,
  DAY_WED,
  DAY_THU,
  DAY_FRI,
  DAY_SAT,
  DAY_SUN,
} from "@/lib";

const DAY_LABELS = ["", DAY_MON, DAY_TUE, DAY_WED, DAY_THU, DAY_FRI, DAY_SAT, DAY_SUN];

interface SuppliersMetricsRowProps {
  spentThisMonth: number;
  supplierCount: number;
  deliveriesThisMonth: number;
  unpaidTotal: number;
  mostOverdueSupplier: Supplier | null;
  mostOverdueDueDate: string | null;
  nextExpectedSupplier: { supplier: Supplier; weekday: number } | null;
}

export function SuppliersMetricsRow({
  spentThisMonth,
  supplierCount,
  deliveriesThisMonth,
  unpaidTotal,
  mostOverdueSupplier,
  mostOverdueDueDate,
  nextExpectedSupplier,
}: SuppliersMetricsRowProps) {
  const avgDelivery = deliveriesThisMonth > 0 ? spentThisMonth / deliveriesThisMonth : 0;

  return (
    <div className="tpl-g4">
      <div className="tpl-metric">
        <p className="tpl-mlbl">{LABEL_SPENT_THIS_MONTH}</p>
        <p className="tpl-mval">{PESO.format(spentThisMonth)}</p>
        <p className="tpl-mfoot">
          {supplierCount} {TEXT_ACROSS_SUPPLIERS_SUFFIX}
        </p>
      </div>
      <div className="tpl-metric">
        <p className="tpl-mlbl">{LABEL_DELIVERIES}</p>
        <p className="tpl-mval">{deliveriesThisMonth}</p>
        <p className="tpl-mfoot">
          {PESO.format(avgDelivery)} {TEXT_AVERAGE_SUFFIX}
        </p>
      </div>
      <div className={`tpl-metric${unpaidTotal > 0 ? " tpl-w" : ""}`}>
        <p className="tpl-mlbl">{LABEL_UNPAID_ON_TERMS}</p>
        <p className={`tpl-mval${unpaidTotal > 0 ? " tpl-warn" : ""}`}>{PESO.format(unpaidTotal)}</p>
        <p className="tpl-mfoot">
          {mostOverdueSupplier
            ? `${mostOverdueSupplier.name}${mostOverdueDueDate ? ` · ${TEXT_DUE_PREFIX} ${DAY_LABELS[isoWeekday(new Date(mostOverdueDueDate))]}` : ""}`
            : TEXT_NOTHING_OWED}
        </p>
      </div>
      <div className="tpl-metric">
        <p className="tpl-mlbl">{LABEL_NEXT_EXPECTED}</p>
        <p className="tpl-mval">{nextExpectedSupplier ? DAY_LABELS[nextExpectedSupplier.weekday] : "—"}</p>
        <p className="tpl-mfoot">{nextExpectedSupplier ? nextExpectedSupplier.supplier.name : TEXT_NO_UPCOMING_DELIVERY}</p>
      </div>
    </div>
  );
}
