import {
  PESO,
  LABEL_ON_SHIFT_NOW,
  LABEL_STAFF_ACCOUNTS,
  LABEL_DRAWER_VARIANCE,
  LABEL_VOIDS_THIS_WEEK,
  TEXT_THIS_WEEK_SUFFIX,
  TEXT_NO_ONE_ON_SHIFT,
} from "@/lib";
import type { StaffAccountCounts, VoidsThisWeek, DrawerVarianceThisWeek } from "../../lib";
import type { OpenShift } from "../../hooksShifts";

const METRIC_BUTTON_STYLE = { textAlign: "left" as const, cursor: "pointer", width: "100%", font: "inherit", color: "inherit" };

interface StaffMetricsProps {
  counts: StaffAccountCounts;
  voids: VoidsThisWeek;
  openShifts: OpenShift[];
  variance: DrawerVarianceThisWeek;
  onStaffAccountsClick: () => void;
  onVoidsClick: () => void;
  onOpenShiftsClick: () => void;
  onVarianceClick: () => void;
}

export function StaffMetrics({
  counts,
  voids,
  openShifts,
  variance,
  onStaffAccountsClick,
  onVoidsClick,
  onOpenShiftsClick,
  onVarianceClick,
}: StaffMetricsProps) {
  const firstShift = openShifts[0];

  return (
    <div className="tpl-g4" style={{ marginTop: 18, marginBottom: 14 }}>
      <button type="button" onClick={onOpenShiftsClick} className="tpl-metric" style={METRIC_BUTTON_STYLE}>
        <p className="tpl-mlbl">{LABEL_ON_SHIFT_NOW}</p>
        <p className="tpl-mval">{openShifts.length}</p>
        <p className="tpl-mfoot tpl-ok">
          {openShifts.length === 0
            ? TEXT_NO_ONE_ON_SHIFT
            : openShifts.length === 1
              ? `${firstShift.staffName} · since ${new Date(firstShift.createdAt).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}`
              : `${openShifts.length} staff on shift`}
        </p>
      </button>
      <button type="button" onClick={onStaffAccountsClick} className="tpl-metric" style={METRIC_BUTTON_STYLE}>
        <p className="tpl-mlbl">{LABEL_STAFF_ACCOUNTS}</p>
        <p className="tpl-mval">{counts.total}</p>
        <p className="tpl-mfoot">
          {counts.admin} admin{counts.admin === 1 ? "" : "s"} · {counts.cashier} cashier{counts.cashier === 1 ? "" : "s"}
        </p>
      </button>
      <button
        type="button"
        onClick={onVarianceClick}
        className="tpl-metric tpl-w"
        style={{ ...METRIC_BUTTON_STYLE, color: "inherit" }}
      >
        <p className="tpl-mlbl" style={{ color: "var(--tpl-warn)" }}>
          {LABEL_DRAWER_VARIANCE}
        </p>
        <p className="tpl-mval tpl-warn">{PESO.format(variance.netVariance)}</p>
        <p className="tpl-mfoot" style={{ color: "var(--tpl-warn)" }}>
          {TEXT_THIS_WEEK_SUFFIX} · {variance.shiftCount} shift{variance.shiftCount === 1 ? "" : "s"}
        </p>
      </button>
      <button type="button" onClick={onVoidsClick} className="tpl-metric" style={METRIC_BUTTON_STYLE}>
        <p className="tpl-mlbl">{LABEL_VOIDS_THIS_WEEK}</p>
        <p className="tpl-mval">{voids.count}</p>
        <p className="tpl-mfoot">{PESO.format(voids.total)} total</p>
      </button>
    </div>
  );
}
