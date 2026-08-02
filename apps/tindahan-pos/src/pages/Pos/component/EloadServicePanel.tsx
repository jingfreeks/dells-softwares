import { useState } from "react";
import {
  NETWORKS,
  detectNetwork,
  isValidMobileNumber,
  eloadFee,
  ELOAD_DENOMINATIONS,
  type Network,
} from "@/lib/pos";
import {
  PESO,
  SERVICE_LABEL_ELOAD,
  LABEL_NETWORK,
  LABEL_MOBILE_NUMBER,
  PLACEHOLDER_MOBILE_NUMBER,
  HINT_INVALID_MOBILE_NUMBER,
  LABEL_AMOUNT,
  LABEL_OTHER,
  LABEL_LOAD_AMOUNT,
  TEXT_FEE_AUTO_SUFFIX,
  LABEL_SERVICE_FEE,
  LABEL_CUSTOMER_PAYS,
  BUTTON_ADD_TO_SALE,
  TEXT_WALLET_AFTER_SALE_PREFIX,
} from "@/lib";

export function EloadServicePanel({
  walletBalance,
  onAdd,
}: {
  walletBalance: number;
  onAdd: (label: string, amount: number, fee: number) => void;
}) {
  const [mobileNumber, setMobileNumber] = useState("");
  const [network, setNetwork] = useState<Network | null>(null);
  const [networkTouched, setNetworkTouched] = useState(false);
  const [selectedDenomination, setSelectedDenomination] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const detectedNetwork = detectNetwork(mobileNumber);
  const effectiveNetwork = networkTouched ? network : (network ?? detectedNetwork);
  const numberIsValid = isValidMobileNumber(mobileNumber);

  const amount = showCustom ? Number(customAmount) || 0 : (selectedDenomination ?? 0);
  const fee = amount > 0 ? eloadFee(amount) : 0;
  const customerPays = amount + fee;
  const canAdd = amount > 0 && numberIsValid && effectiveNetwork !== null;

  function handleNetworkClick(n: Network) {
    setNetwork(n);
    setNetworkTouched(true);
  }

  function handleAdd() {
    if (!canAdd || !effectiveNetwork) return;
    onAdd(`${effectiveNetwork} load ₱${amount} · ${mobileNumber.trim()}`, amount, fee);
    setSelectedDenomination(null);
    setCustomAmount("");
    setShowCustom(false);
  }

  return (
    <div className="tpl-card">
      <div className="tpl-sp" style={{ marginBottom: 14 }}>
        <p className="tpl-h3">{SERVICE_LABEL_ELOAD}</p>
        <span className="tpl-ts">
          {TEXT_WALLET_AFTER_SALE_PREFIX} {PESO.format(walletBalance - amount)}
        </span>
      </div>

      <p className="tpl-seclbl">{LABEL_NETWORK}</p>
      <div className="tpl-g5" style={{ marginBottom: 14 }}>
        {NETWORKS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => handleNetworkClick(n)}
            className={`tpl-opt${effectiveNetwork === n ? " tpl-on" : ""}`}
          >
            {n}
          </button>
        ))}
      </div>

      <p className="tpl-seclbl">{LABEL_MOBILE_NUMBER}</p>
      <div className={`tpl-fld${mobileNumber && numberIsValid ? " tpl-good" : ""}`} style={{ marginBottom: 6 }}>
        <input
          aria-label={LABEL_MOBILE_NUMBER}
          type="tel"
          placeholder={PLACEHOLDER_MOBILE_NUMBER}
          value={mobileNumber}
          onChange={(e) => {
            setMobileNumber(e.target.value);
            if (!networkTouched) setNetwork(null);
          }}
          className="tpl-mono"
        />
        {mobileNumber && numberIsValid && effectiveNetwork && (
          <span className="tpl-fld-ok" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
            <i className="ti ti-check" aria-hidden /> {effectiveNetwork}
          </span>
        )}
      </div>
      {mobileNumber && !numberIsValid && (
        <p className="tpl-strength-hint" style={{ marginBottom: 14, color: "var(--tpl-bad)" }}>
          {HINT_INVALID_MOBILE_NUMBER}
        </p>
      )}
      {(!mobileNumber || numberIsValid) && <div style={{ marginBottom: 8 }} />}

      <p className="tpl-seclbl">{LABEL_AMOUNT.toUpperCase()}</p>
      <div className="tpl-g6" style={{ marginBottom: 14 }}>
        {ELOAD_DENOMINATIONS.map((d) => (
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
            <span>+{eloadFee(d)}</span>
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

      <div className="tpl-card" style={{ background: "rgba(255,255,255,.04)", marginBottom: 14 }}>
        <div className="tpl-sp" style={{ padding: "2px 0" }}>
          <span className="tpl-sub" style={{ margin: 0 }}>
            {LABEL_LOAD_AMOUNT}
          </span>
          <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>{PESO.format(amount)}</span>
        </div>
        <div className="tpl-sp" style={{ padding: "2px 0", marginBottom: 8 }}>
          <span className="tpl-sub" style={{ margin: 0 }}>
            {LABEL_SERVICE_FEE} <span style={{ color: "var(--tpl-t9)" }}>· {TEXT_FEE_AUTO_SUFFIX}</span>
          </span>
          <span style={{ color: "var(--tpl-ok)", fontSize: 13 }}>{PESO.format(fee)}</span>
        </div>
        <div
          className="tpl-sp"
          style={{ paddingTop: 9, borderTop: "0.5px solid rgba(255,255,255,.08)" }}
        >
          <span className="tpl-h3">{LABEL_CUSTOMER_PAYS}</span>
          <span style={{ color: "var(--tpl-t1)", fontSize: 20, fontWeight: 500 }}>{PESO.format(customerPays)}</span>
        </div>
      </div>

      <button type="button" onClick={handleAdd} disabled={!canAdd} className="tpl-btnp">
        {BUTTON_ADD_TO_SALE}
      </button>
    </div>
  );
}
