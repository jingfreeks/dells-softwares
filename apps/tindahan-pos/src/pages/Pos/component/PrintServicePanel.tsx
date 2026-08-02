import { useState } from "react";
import { PRINT_JOB_TYPES, printBulkDiscount, type PrintJobKey } from "@/lib/pos";
import {
  PESO,
  SERVICE_LABEL_PRINT,
  LABEL_JOB_TYPE,
  TEXT_PER_PAGE_SUFFIX,
  TEXT_PER_JOB_SUFFIX,
  LABEL_PAGES,
  ARIA_DECREASE_PAGES,
  ARIA_INCREASE_PAGES,
  LABEL_SINGLE_SIDED,
  LABEL_DOUBLE_SIDED,
  LABEL_PAPER_A4,
  TEXT_PAGES_SUFFIX,
  LABEL_BULK_DISCOUNT_10_PAGES,
  LABEL_TOTAL_POS,
  BUTTON_ADD_TO_SALE,
} from "@/lib";

const PAGE_QUICK_ADDS = [5, 10, 50];
const OPTION_CHIPS = [LABEL_SINGLE_SIDED, LABEL_DOUBLE_SIDED, LABEL_PAPER_A4];

export function PrintServicePanel({ onAdd }: { onAdd: (label: string, amount: number, fee: number) => void }) {
  const [jobKey, setJobKey] = useState<PrintJobKey>(PRINT_JOB_TYPES[0].key);
  const [pages, setPages] = useState(1);
  const [activeOptions, setActiveOptions] = useState<string[]>([LABEL_SINGLE_SIDED]);

  const job = PRINT_JOB_TYPES.find((j) => j.key === jobKey)!;
  const effectivePages = job.unit === "job" ? 1 : pages;
  const subtotal = effectivePages * job.pricePerUnit;
  const discount = printBulkDiscount(subtotal, effectivePages);
  const total = subtotal - discount;

  function toggleOption(option: string) {
    setActiveOptions((prev) => (prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]));
  }

  function handleAdd() {
    if (total <= 0) return;
    const detail = job.unit === "job" ? job.label : `${job.label} · ${effectivePages} ${TEXT_PAGES_SUFFIX}`;
    const optionsSuffix = activeOptions.length > 0 ? ` · ${activeOptions.join(", ")}` : "";
    onAdd(`${detail}${optionsSuffix}`, total, 0);
    setPages(1);
  }

  return (
    <div className="tpl-card">
      <p className="tpl-h3" style={{ marginBottom: 14 }}>
        {SERVICE_LABEL_PRINT}
      </p>

      <p className="tpl-seclbl">{LABEL_JOB_TYPE}</p>
      <div className="tpl-g2" style={{ marginBottom: 14, gap: 6 }}>
        {PRINT_JOB_TYPES.map((j) => (
          <button
            key={j.key}
            type="button"
            onClick={() => setJobKey(j.key)}
            className={`tpl-opt${jobKey === j.key ? " tpl-on" : ""}`}
            style={{
              height: "auto",
              padding: "9px 11px",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 1,
            }}
          >
            <span style={{ fontSize: 13 }}>{j.label}</span>
            <span style={{ fontSize: 11, opacity: 0.8 }}>
              {PESO.format(j.pricePerUnit)} {j.unit === "page" ? TEXT_PER_PAGE_SUFFIX : TEXT_PER_JOB_SUFFIX}
            </span>
          </button>
        ))}
      </div>

      {job.unit === "page" && (
        <>
          <p className="tpl-seclbl">{LABEL_PAGES.toUpperCase()}</p>
          <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
            <button
              type="button"
              aria-label={ARIA_DECREASE_PAGES}
              onClick={() => setPages((p) => Math.max(1, p - 1))}
              className="tpl-opt"
              style={{ width: 38 }}
            >
              −
            </button>
            <span style={{ color: "var(--tpl-t1)", fontSize: 22, fontWeight: 500, minWidth: 40, textAlign: "center" }}>
              {pages}
            </span>
            <button
              type="button"
              aria-label={ARIA_INCREASE_PAGES}
              onClick={() => setPages((p) => p + 1)}
              className="tpl-opt"
              style={{ width: 38 }}
            >
              +
            </button>
            <div className="flex gap-1" style={{ marginLeft: "auto" }}>
              {PAGE_QUICK_ADDS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPages((p) => p + n)}
                  className="tpl-opt"
                  style={{ width: 40, fontSize: 12 }}
                >
                  +{n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 14 }}>
            {OPTION_CHIPS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => toggleOption(option)}
                className={`tpl-chip${activeOptions.includes(option) ? " tpl-on" : ""}`}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="tpl-card" style={{ background: "rgba(255,255,255,.04)", marginBottom: 14 }}>
        <div className="tpl-sp" style={{ padding: "2px 0" }}>
          <span className="tpl-sub" style={{ margin: 0 }}>
            {effectivePages} {TEXT_PAGES_SUFFIX} × {PESO.format(job.pricePerUnit)}
          </span>
          <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>{PESO.format(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="tpl-sp" style={{ padding: "2px 0", marginBottom: 8 }}>
            <span className="tpl-sub" style={{ margin: 0 }}>
              {LABEL_BULK_DISCOUNT_10_PAGES}
            </span>
            <span style={{ color: "var(--tpl-ok)", fontSize: 13 }}>−{PESO.format(discount)}</span>
          </div>
        )}
        <div className="tpl-sp" style={{ paddingTop: 9, borderTop: "0.5px solid rgba(255,255,255,.08)" }}>
          <span className="tpl-h3">{LABEL_TOTAL_POS}</span>
          <span style={{ color: "var(--tpl-t1)", fontSize: 20, fontWeight: 500 }}>{PESO.format(total)}</span>
        </div>
      </div>

      <button type="button" onClick={handleAdd} disabled={total <= 0} className="tpl-btnp">
        {BUTTON_ADD_TO_SALE}
      </button>
    </div>
  );
}
