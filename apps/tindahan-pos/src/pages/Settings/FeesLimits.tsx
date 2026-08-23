import {
  PAGE_HEADING_FEES_AND_LIMITS,
  TEXT_FEES_AND_LIMITS_DESCRIPTION,
  LABEL_UNSAVED_CHANGES_CHIP,
  LABEL_ELOAD_FEE,
  LABEL_CASH_IN_FEE,
  LABEL_CASH_OUT_FEE,
  BUTTON_SAVE_CHANGES,
  BUTTON_SAVING,
  BUTTON_DISCARD,
  TEXT_FEES_AND_LIMITS_UPDATED,
} from "@/lib";
import { SettingsLayout, FeeBracketCard, PrintPhotocopyCard, CashAndCreditLimitsCard } from "./component";
import { useFeesLimitsPage } from "./useFeesLimitsPage";

export function FeesLimits() {
  const {
    eloadBrackets,
    cashInBrackets,
    cashOutBrackets,
    updateBracketFee,
    updateBracketMax,
    addBracket,
    removeBracket,
    mock,
    setMockField,
    toggleMockField,
    formError,
    justSaved,
    submitting,
    isDirty,
    onSubmit,
    onDiscard,
  } = useFeesLimitsPage();

  return (
    <SettingsLayout>
      <form onSubmit={onSubmit} noValidate>
        <div className="tpl-hd">
          <div>
            <p className="tpl-h1" style={{ fontSize: 21 }}>
              {PAGE_HEADING_FEES_AND_LIMITS}
            </p>
            <p className="tpl-sub">{TEXT_FEES_AND_LIMITS_DESCRIPTION}</p>
          </div>
          {isDirty && <span className="tpl-chip tpl-w">{LABEL_UNSAVED_CHANGES_CHIP}</span>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" style={{ marginBottom: 11 }}>
          <FeeBracketCard
            title={LABEL_ELOAD_FEE}
            brackets={eloadBrackets}
            onFeeChange={(index, fee) => updateBracketFee("eload", index, fee)}
            onMaxChange={(index, max) => updateBracketMax("eload", index, max)}
            onAdd={() => addBracket("eload")}
            onRemove={(index) => removeBracket("eload", index)}
          />
          <FeeBracketCard
            title={LABEL_CASH_IN_FEE}
            brackets={cashInBrackets}
            onFeeChange={(index, fee) => updateBracketFee("cashIn", index, fee)}
            onMaxChange={(index, max) => updateBracketMax("cashIn", index, max)}
            onAdd={() => addBracket("cashIn")}
            onRemove={(index) => removeBracket("cashIn", index)}
          />
          <FeeBracketCard
            title={LABEL_CASH_OUT_FEE}
            brackets={cashOutBrackets}
            onFeeChange={(index, fee) => updateBracketFee("cashOut", index, fee)}
            onMaxChange={(index, max) => updateBracketMax("cashOut", index, max)}
            onAdd={() => addBracket("cashOut")}
            onRemove={(index) => removeBracket("cashOut", index)}
          />
        </div>

        <PrintPhotocopyCard
          printBw={mock.printBw}
          onPrintBwChange={(value) => setMockField("printBw", value)}
          printColour={mock.printColour}
          onPrintColourChange={(value) => setMockField("printColour", value)}
          photocopy={mock.photocopy}
          onPhotocopyChange={(value) => setMockField("photocopy", value)}
          bulkFromPages={mock.bulkFromPages}
          onBulkFromPagesChange={(value) => setMockField("bulkFromPages", value)}
        />

        <CashAndCreditLimitsCard
          keepInDrawer={mock.keepInDrawer}
          onKeepInDrawerChange={(value) => setMockField("keepInDrawer", value)}
          defaultCreditLimit={mock.defaultCreditLimit}
          onDefaultCreditLimitChange={(value) => setMockField("defaultCreditLimit", value)}
          cashierCashOutCap={mock.cashierCashOutCap}
          onCashierCashOutCapChange={(value) => setMockField("cashierCashOutCap", value)}
          blockUtangPastLimit={mock.blockUtangPastLimit}
          onToggleBlockUtangPastLimit={() => toggleMockField("blockUtangPastLimit")}
          voidNeedsPin={mock.voidNeedsPin}
          onToggleVoidNeedsPin={() => toggleMockField("voidNeedsPin")}
          warnLowEloadFloat={mock.warnLowEloadFloat}
          onToggleWarnLowEloadFloat={() => toggleMockField("warnLowEloadFloat")}
        />

        {formError && (
          <p role="alert" className="tpl-emsg" style={{ marginBottom: 14 }}>
            <i className="ti ti-alert-circle" aria-hidden />
            {formError}
          </p>
        )}
        {justSaved && (
          <p role="status" className="tpl-ok" style={{ marginBottom: 14, fontSize: 13 }}>
            {TEXT_FEES_AND_LIMITS_UPDATED}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <button
            type="submit"
            className="tpl-btnp w-full! sm:w-auto!"
            style={{ marginBottom: 0, whiteSpace: "nowrap" }}
            disabled={submitting || !isDirty}
          >
            {submitting ? BUTTON_SAVING : BUTTON_SAVE_CHANGES}
          </button>
          <button type="button" className="tpl-txt text-center sm:text-left" onClick={onDiscard}>
            {BUTTON_DISCARD}
          </button>
        </div>
      </form>
    </SettingsLayout>
  );
}
