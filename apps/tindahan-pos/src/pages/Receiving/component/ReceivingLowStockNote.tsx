import type { Product } from "@/lib";
import { TEXT_LOW_OR_OUT_SUFFIX, TEXT_PRODUCT_LOW_OR_OUT_SUFFIX, TEXT_ADD_ALL_SUGGESTED_HINT, BUTTON_ADD_ALL_PREFIX } from "@/lib";

interface ReceivingLowStockNoteProps {
  suggestions: Product[];
  onAddAll: () => void;
}

export function ReceivingLowStockNote({ suggestions, onAddAll }: ReceivingLowStockNoteProps) {
  if (suggestions.length === 0) return null;

  const names = suggestions
    .slice(0, 3)
    .map((p) => p.name)
    .join(", ");

  return (
    <div className="tpl-note tpl-b" style={{ marginBottom: 14 }}>
      <i className="ti ti-sparkles tpl-acc" aria-hidden />
      <div className="tpl-flex1">
        <p className="tpl-nt" style={{ color: "var(--tpl-a4)" }}>
          {suggestions.length} {suggestions.length === 1 ? TEXT_PRODUCT_LOW_OR_OUT_SUFFIX : TEXT_LOW_OR_OUT_SUFFIX}
        </p>
        <p className="tpl-ns">
          {names}
          {suggestions.length > 3 ? "…" : ""} {TEXT_ADD_ALL_SUGGESTED_HINT}
        </p>
      </div>
      <span role="button" tabIndex={0} className="tpl-btnp" style={{ alignSelf: "center", width: "auto", height: 34, padding: "0 14px", marginBottom: 0 }} onClick={onAddAll} onKeyDown={(e) => e.key === "Enter" && onAddAll()}>
        {BUTTON_ADD_ALL_PREFIX} {suggestions.length}
      </span>
    </div>
  );
}
