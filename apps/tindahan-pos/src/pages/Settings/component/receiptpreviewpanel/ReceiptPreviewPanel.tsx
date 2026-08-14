import {
  LABEL_PREVIEW,
  BUTTON_TEST_PRINT,
  BUTTON_58MM,
  TEXT_PREVIEW_STORE_ADDRESS_FALLBACK,
  TEXT_PREVIEW_CASHIER_LABEL,
  TEXT_PREVIEW_TOTAL,
  TEXT_PREVIEW_CASH,
  TEXT_PREVIEW_CHANGE,
} from "@/lib";

const SAMPLE_ITEMS = [
  { name: "Pancit Canton x3", amount: "54.00" },
  { name: "Skyflakes x2", amount: "18.00" },
  { name: "Globe load 100", amount: "100.00" },
  { name: "Service fee", amount: "5.00" },
];
const SAMPLE_TIMESTAMP_LINE = "01 Aug 9:14 AM";
const SAMPLE_CASHIER_NAME = "Maricel";
const SAMPLE_TOTAL = "177.00";
const SAMPLE_CASH = "200.00";
const SAMPLE_CHANGE = "23.00";

interface ReceiptPreviewPanelProps {
  storeName: string;
  storeAddress: string | null;
  city: string;
  contactNumber: string;
  includeLogo: boolean;
  includeTinAndPermit: boolean;
  tin: string;
  includeCashierName: boolean;
  footerMessage: string;
  /** The real next invoice number for this store, or null while it's loading. */
  nextReceiptNumber: string | null;
}

export function ReceiptPreviewPanel({
  storeName,
  storeAddress,
  city,
  contactNumber,
  includeLogo,
  includeTinAndPermit,
  tin,
  includeCashierName,
  footerMessage,
  nextReceiptNumber,
}: ReceiptPreviewPanelProps) {
  const addressLine = storeAddress ?? TEXT_PREVIEW_STORE_ADDRESS_FALLBACK;
  const cityAndPhone = [city, contactNumber].filter(Boolean).join(" · ");

  return (
    <div>
      <p className="tpl-seclbl" style={{ marginBottom: 8 }}>
        {LABEL_PREVIEW}
      </p>
      <div
        style={{
          background: "#F5F3EE",
          borderRadius: 8,
          padding: "16px 14px",
          fontFamily: "var(--tpl-mono, monospace)",
          boxShadow: "0 10px 28px rgba(0,0,0,.35)",
        }}
      >
        {includeLogo && (
          <p style={{ color: "#1A1A18", fontSize: 13, textAlign: "center", fontWeight: 500 }}>
            {storeName.toUpperCase()}
          </p>
        )}
        <p style={{ color: "#5F5E5A", fontSize: 10, textAlign: "center", lineHeight: 1.5 }}>
          {addressLine}
          {cityAndPhone && (
            <>
              <br />
              {cityAndPhone}
            </>
          )}
        </p>
        {includeTinAndPermit && tin && (
          <p style={{ color: "#5F5E5A", fontSize: 9.5, textAlign: "center", marginTop: 4 }}>TIN {tin}</p>
        )}
        <p style={{ margin: "8px 0", color: "#B4B2A9", fontSize: 10, textAlign: "center" }}>
          - - - - - - - - - - - - - - - - -
        </p>
        <p style={{ color: "#5F5E5A", fontSize: 10 }}>
          {nextReceiptNumber ?? "…"} · {SAMPLE_TIMESTAMP_LINE}
          {includeCashierName && (
            <>
              <br />
              {TEXT_PREVIEW_CASHIER_LABEL} {SAMPLE_CASHIER_NAME}
            </>
          )}
        </p>
        <p style={{ margin: "8px 0", color: "#B4B2A9", fontSize: 10, textAlign: "center" }}>
          - - - - - - - - - - - - - - - - -
        </p>
        {SAMPLE_ITEMS.map((item) => (
          <div key={item.name} style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#2C2C2A", fontSize: 11 }}>{item.name}</span>
            <span style={{ color: "#2C2C2A", fontSize: 11 }}>{item.amount}</span>
          </div>
        ))}
        <p style={{ margin: "8px 0", color: "#B4B2A9", fontSize: 10, textAlign: "center" }}>
          - - - - - - - - - - - - - - - - -
        </p>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#1A1A18", fontSize: 13, fontWeight: 500 }}>{TEXT_PREVIEW_TOTAL}</span>
          <span style={{ color: "#1A1A18", fontSize: 13, fontWeight: 500 }}>{SAMPLE_TOTAL}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#5F5E5A", fontSize: 11 }}>{TEXT_PREVIEW_CASH}</span>
          <span style={{ color: "#5F5E5A", fontSize: 11 }}>{SAMPLE_CASH}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#5F5E5A", fontSize: 11 }}>{TEXT_PREVIEW_CHANGE}</span>
          <span style={{ color: "#5F5E5A", fontSize: 11 }}>{SAMPLE_CHANGE}</span>
        </div>
        {footerMessage && (
          <>
            <p style={{ margin: "8px 0", color: "#B4B2A9", fontSize: 10, textAlign: "center" }}>
              - - - - - - - - - - - - - - - - -
            </p>
            <p style={{ color: "#5F5E5A", fontSize: 10, textAlign: "center" }}>{footerMessage}</p>
          </>
        )}
      </div>
      <div className="tpl-row" style={{ gap: 6, marginTop: 10 }}>
        <span className="tpl-btn" style={{ flex: 1, justifyContent: "center", cursor: "default" }}>
          {BUTTON_TEST_PRINT}
        </span>
        <span className="tpl-btn" style={{ flex: 1, justifyContent: "center", cursor: "default" }}>
          {BUTTON_58MM}
        </span>
      </div>
    </div>
  );
}
