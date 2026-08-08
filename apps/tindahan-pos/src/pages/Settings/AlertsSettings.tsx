import {
  PAGE_HEADING_ALERTS,
  TEXT_ALERTS_DESCRIPTION,
  LABEL_UNSAVED_CHANGES_CHIP,
  BUTTON_SAVE_CHANGES,
  BUTTON_DISCARD,
  TEXT_ALERTS_UPDATED,
} from "@/lib";
import { SettingsLayout, StockAlertCard, MoneyAlertCard, HowAndWhenCard } from "./component";
import { useAlertsPage } from "./useAlertsPage";

export function AlertsSettings() {
  const {
    thresholdDays,
    setThresholdDays,
    minThresholdDays,
    maxThresholdDays,
    fastMoverBoost,
    toggleFastMoverBoost,
    warnOutOfStockImmediately,
    toggleWarnOutOfStockImmediately,

    drawerVarianceThreshold,
    setDrawerVarianceThreshold,
    utangAgingThresholdDays,
    setUtangAgingThresholdDays,
    warnLowEloadFloat,
    toggleWarnLowEloadFloat,
    alertOnVoidAfterPayment,
    toggleAlertOnVoidAfterPayment,

    pushEnabled,
    smsEnabled,
    emailEnabled,
    toggleChannel,
    dailySummaryTime,
    setDailySummaryTime,
    quietHoursStart,
    setQuietHoursStart,
    quietHoursEnd,
    setQuietHoursEnd,

    formError,
    justSaved,
    isDirty,
    onSubmit,
    onDiscard,
  } = useAlertsPage();

  return (
    <SettingsLayout>
      <form onSubmit={onSubmit} noValidate>
        <div className="tpl-hd">
          <div>
            <p className="tpl-h1" style={{ fontSize: 21 }}>
              {PAGE_HEADING_ALERTS}
            </p>
            <p className="tpl-sub">{TEXT_ALERTS_DESCRIPTION}</p>
          </div>
          {isDirty && <span className="tpl-chip tpl-w">{LABEL_UNSAVED_CHANGES_CHIP}</span>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2" style={{ marginBottom: 11 }}>
          <StockAlertCard
            thresholdDays={thresholdDays}
            onThresholdDaysChange={setThresholdDays}
            minThresholdDays={minThresholdDays}
            maxThresholdDays={maxThresholdDays}
            fastMoverBoost={fastMoverBoost}
            onToggleFastMoverBoost={toggleFastMoverBoost}
            warnOutOfStockImmediately={warnOutOfStockImmediately}
            onToggleWarnOutOfStockImmediately={toggleWarnOutOfStockImmediately}
          />
          <MoneyAlertCard
            drawerVarianceThreshold={drawerVarianceThreshold}
            onDrawerVarianceThresholdChange={setDrawerVarianceThreshold}
            utangAgingThresholdDays={utangAgingThresholdDays}
            onUtangAgingThresholdDaysChange={setUtangAgingThresholdDays}
            warnLowEloadFloat={warnLowEloadFloat}
            onToggleWarnLowEloadFloat={toggleWarnLowEloadFloat}
            alertOnVoidAfterPayment={alertOnVoidAfterPayment}
            onToggleAlertOnVoidAfterPayment={toggleAlertOnVoidAfterPayment}
          />
        </div>

        <HowAndWhenCard
          pushEnabled={pushEnabled}
          smsEnabled={smsEnabled}
          emailEnabled={emailEnabled}
          onToggleChannel={toggleChannel}
          dailySummaryTime={dailySummaryTime}
          onDailySummaryTimeChange={setDailySummaryTime}
          quietHoursStart={quietHoursStart}
          onQuietHoursStartChange={setQuietHoursStart}
          quietHoursEnd={quietHoursEnd}
          onQuietHoursEndChange={setQuietHoursEnd}
        />

        {formError && (
          <p role="alert" className="tpl-emsg" style={{ marginBottom: 14 }}>
            <i className="ti ti-alert-circle" aria-hidden />
            {formError}
          </p>
        )}
        {justSaved && (
          <p role="status" className="tpl-ok" style={{ marginBottom: 14, fontSize: 13 }}>
            {TEXT_ALERTS_UPDATED}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <button
            type="submit"
            className="tpl-btnp w-full! sm:w-auto!"
            style={{ marginBottom: 0, whiteSpace: "nowrap" }}
            disabled={!isDirty}
          >
            {BUTTON_SAVE_CHANGES}
          </button>
          <button type="button" className="tpl-txt text-center sm:text-left" onClick={onDiscard}>
            {BUTTON_DISCARD}
          </button>
        </div>
      </form>
    </SettingsLayout>
  );
}
