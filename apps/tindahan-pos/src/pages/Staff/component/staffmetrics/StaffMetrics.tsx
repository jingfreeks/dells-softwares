import { PESO, LABEL_ON_SHIFT_NOW, LABEL_STAFF_ACCOUNTS, LABEL_DRAWER_VARIANCE, LABEL_VOIDS_THIS_WEEK, TEXT_THIS_WEEK_SUFFIX } from "@/lib";
import type { StaffAccountCounts } from "../../lib";
import {
  MOCK_ON_SHIFT_NAME,
  MOCK_ON_SHIFT_SINCE,
  MOCK_DRAWER_VARIANCE,
  MOCK_DRAWER_VARIANCE_SHIFT_COUNT,
  MOCK_VOIDS_COUNT,
  MOCK_VOIDS_TOTAL,
} from "./mockShiftMetrics";

interface StaffMetricsProps {
  counts: StaffAccountCounts;
}

export function StaffMetrics({ counts }: StaffMetricsProps) {
  return (
    <div className="tpl-g4" style={{ marginTop: 18, marginBottom: 14 }}>
      <div className="tpl-metric">
        <p className="tpl-mlbl">{LABEL_ON_SHIFT_NOW}</p>
        <p className="tpl-mval">1</p>
        <p className="tpl-mfoot tpl-ok">
          {MOCK_ON_SHIFT_NAME} · since {MOCK_ON_SHIFT_SINCE}
        </p>
      </div>
      <div className="tpl-metric">
        <p className="tpl-mlbl">{LABEL_STAFF_ACCOUNTS}</p>
        <p className="tpl-mval">{counts.total}</p>
        <p className="tpl-mfoot">
          {counts.admin} admin{counts.admin === 1 ? "" : "s"} · {counts.cashier} cashier{counts.cashier === 1 ? "" : "s"}
        </p>
      </div>
      <div className="tpl-metric tpl-w">
        <p className="tpl-mlbl" style={{ color: "var(--tpl-warn)" }}>{LABEL_DRAWER_VARIANCE}</p>
        <p className="tpl-mval tpl-warn">{PESO.format(MOCK_DRAWER_VARIANCE)}</p>
        <p className="tpl-mfoot" style={{ color: "var(--tpl-warn)" }}>
          {TEXT_THIS_WEEK_SUFFIX} · {MOCK_DRAWER_VARIANCE_SHIFT_COUNT} shift
        </p>
      </div>
      <div className="tpl-metric">
        <p className="tpl-mlbl">{LABEL_VOIDS_THIS_WEEK}</p>
        <p className="tpl-mval">{MOCK_VOIDS_COUNT}</p>
        <p className="tpl-mfoot">{PESO.format(MOCK_VOIDS_TOTAL)} total</p>
      </div>
    </div>
  );
}
