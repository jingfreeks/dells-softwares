import { useState } from "react";
import { LABEL_HER_PIN, LINK_GENERATE_ANOTHER, ARIA_COPY_PIN, TEXT_PIN_COPIED, HINT_PIN_SHOWN_ONCE } from "@/lib";

interface PinGeneratorProps {
  pin: string;
  onRegenerate: () => void;
}

export function PinGenerator({ pin, onRegenerate }: PinGeneratorProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by the browser — nothing to recover from here.
    }
  }

  return (
    <>
      <div className="tpl-note tpl-b" style={{ display: "block", marginBottom: 7 }}>
        <div className="tpl-sp" style={{ marginBottom: 11 }}>
          <span className="tpl-seclbl" style={{ margin: 0 }}>{LABEL_HER_PIN}</span>
          <button type="button" onClick={onRegenerate} className="tpl-lnk" style={{ fontSize: 12 }}>
            <i className="ti ti-refresh" aria-hidden /> {LINK_GENERATE_ANOTHER}
          </button>
        </div>
        <div className="tpl-row" style={{ gap: 8 }}>
          {pin.split("").map((digit, i) => (
            <span
              key={i}
              className="mono"
              data-testid="pin-digit"
              style={{
                flex: 1,
                background: "rgba(255,255,255,.06)",
                border: "0.5px solid rgba(255,255,255,.12)",
                borderRadius: 9,
                height: 46,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--tpl-t1)",
                fontSize: 23,
                fontWeight: 500,
              }}
            >
              {digit}
            </span>
          ))}
          <button
            type="button"
            onClick={handleCopy}
            aria-label={ARIA_COPY_PIN}
            className="tpl-btn"
            style={{ width: 46, height: 46, padding: 0, marginBottom: 0 }}
          >
            <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} aria-hidden />
          </button>
        </div>
        {copied && (
          <p className="tpl-ts tpl-ok" style={{ marginTop: 6 }}>
            {TEXT_PIN_COPIED}
          </p>
        )}
      </div>
      <p className="tpl-hint" style={{ marginBottom: 16 }}>{HINT_PIN_SHOWN_ONCE}</p>
    </>
  );
}
