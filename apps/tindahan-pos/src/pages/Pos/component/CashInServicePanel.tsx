import { useState } from "react";
import { CASH_PROVIDERS, CASH_IN_DENOMINATIONS, cashInFee, isValidMobileNumber, type CashProvider } from "@/lib/pos";
import {
  PESO,
  SERVICE_LABEL_CASHIN,
  LABEL_RECIPIENT_NUMBER,
  PLACEHOLDER_MOBILE_NUMBER,
  HINT_INVALID_MOBILE_NUMBER,
  LABEL_AMOUNT,
  LABEL_OTHER,
  LABEL_REFERENCE_TRANSACTION_NO,
  PLACEHOLDER_REFERENCE_NO,
  LABEL_SENT_TO_CUSTOMER,
  LABEL_SERVICE_FEE,
  TEXT_FEE_AUTO_SUFFIX,
  LABEL_CASH_TO_COLLECT,
  TEXT_DRAWER_AFTER_SALE_PREFIX,
  BUTTON_ADD_TO_SALE,
} from "@/lib";

export function CashInServicePanel({
  drawerBalance,
  onAdd,
}: {
  drawerBalance: number;
  onAdd: (label: string, amount: number, fee: number) => void;
}) {
  const [provider, setProvider] = useState<CashProvider>(CASH_PROVIDERS[0]);
  const [recipientNumber, setRecipientNumber] = useState("");
  const [selectedDenomination, setSelectedDenomination] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [referenceNo, setReferenceNo] = useState("");

  const numberIsValid = isValidMobileNumber(recipientNumber);
  const amount = showCustom ? Number(customAmount) || 0 : (selectedDenomination ?? 0);
  const fee = amount > 0 ? cashInFee(amount) : 0;
  const cashToCollect = amount + fee;
  const canAdd = amount > 0 && numberIsValid && referenceNo.trim() !== "";

  function handleAdd() {
    if (!canAdd) return;
    onAdd(`${provider} cash-in ₱${amount} · ${recipientNumber.trim()} · ref ${referenceNo.trim()}`, amount, fee);
    setSelectedDenomination(null);
    setCustomAmount("");
    setShowCustom(false);
    setReferenceNo("");
  }

  return (
    <div className="tpl-card">
      <p className="tpl-h3" style={{ marginBottom: 14 }}>
        {SERVICE_LABEL_CASHIN}
      </p>

      <div className="tpl-seg" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {CASH_PROVIDERS.map((p) => (
          <button key={p} type="button" onClick={() => setProvider(p)} className={provider === p ? "tpl-on" : ""}>
            {p}
          </button>
        ))}
      </div>

      <p className="tpl-seclbl">{LABEL_RECIPIENT_NUMBER}</p>
      <div className={`tpl-fld${recipientNumber && numberIsValid ? " tpl-good" : ""}`} style={{ marginBottom: 6 }}>
        <input
          aria-label={LABEL_RECIPIENT_NUMBER}
          type="tel"
          placeholder={PLACEHOLDER_MOBILE_NUMBER}
          value={recipientNumber}
          onChange={(e) => setRecipientNumber(e.target.value)}
          className="tpl-mono"
        />
      </div>
      {recipientNumber && !numberIsValid && (
        <p className="tpl-strength-hint" style={{ marginBottom: 14, color: "var(--tpl-bad)" }}>
          {HINT_INVALID_MOBILE_NUMBER}
        </p>
      )}
      {(!recipientNumber || numberIsValid) && <div style={{ marginBottom: 8 }} />}

      <p className="tpl-seclbl">{LABEL_AMOUNT.toUpperCase()}</p>
      <div className="tpl-g4" style={{ marginBottom: 14 }}>
        {CASH_IN_DENOMINATIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => {
              setSelectedDenomination(d);
              setShowCustom(false);
            }}
            className={`tpl-denom${!showCustom && selectedDenomination === d ? " tpl-on" : ""}`}
          >
            <span>{PESO.format(d).replace(".00", "")}</span>
            <span>+{cashInFee(d)}</span>
          </button>
        ))}
        {showCustom ? (
          <div className="tpl-fld" style={{ height: 44, padding: "0 10px" }}>
            <input
              aria-label={LABEL_OTHER}
              type="number"
              min="0"
              autoFocus
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setShowCustom(true);
              setSelectedDenomination(null);
            }}
            className="tpl-denom tpl-dash"
          >
            {LABEL_OTHER}
          </button>
        )}
      </div>

      <p className="tpl-seclbl">{LABEL_REFERENCE_TRANSACTION_NO}</p>
      <div className="tpl-fld" style={{ marginBottom: 14 }}>
        <input
          aria-label={LABEL_REFERENCE_TRANSACTION_NO}
          type="text"
          placeholder={PLACEHOLDER_REFERENCE_NO}
          value={referenceNo}
          onChange={(e) => setReferenceNo(e.target.value)}
          className="tpl-mono"
        />
      </div>

      <div className="tpl-card" style={{ background: "rgba(255,255,255,.04)", marginBottom: 14 }}>
        <div className="tpl-sp" style={{ padding: "2px 0" }}>
          <span className="tpl-sub" style={{ margin: 0 }}>
            {LABEL_SENT_TO_CUSTOMER}
          </span>
          <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>{PESO.format(amount)}</span>
        </div>
        <div className="tpl-sp" style={{ padding: "2px 0", marginBottom: 8 }}>
          <span className="tpl-sub" style={{ margin: 0 }}>
            {LABEL_SERVICE_FEE} <span style={{ color: "var(--tpl-t9)" }}>· {TEXT_FEE_AUTO_SUFFIX}</span>
          </span>
          <span style={{ color: "var(--tpl-ok)", fontSize: 13 }}>{PESO.format(fee)}</span>
        </div>
        <div className="tpl-sp" style={{ paddingTop: 9, borderTop: "0.5px solid rgba(255,255,255,.08)" }}>
          <span className="tpl-h3">{LABEL_CASH_TO_COLLECT}</span>
          <span style={{ color: "var(--tpl-t1)", fontSize: 20, fontWeight: 500 }}>{PESO.format(cashToCollect)}</span>
        </div>
        <p className="tpl-hint">
          {TEXT_DRAWER_AFTER_SALE_PREFIX} {PESO.format(drawerBalance + cashToCollect)}
        </p>
      </div>

      <button type="button" onClick={handleAdd} disabled={!canAdd} className="tpl-btnp">
        {BUTTON_ADD_TO_SALE}
      </button>
    </div>
  );
}
