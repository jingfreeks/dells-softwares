import type { Product } from "@/lib";
import {
  receivingTotalCost,
  stockPreview,
  PESO,
  selectOnFocus,
  TABLE_HEADER_PRODUCT,
  TABLE_HEADER_QTY_RECEIVED,
  TABLE_HEADER_COST_EACH,
  TABLE_HEADER_NEW_STOCK,
  BUTTON_REMOVE,
  LABEL_TOTAL_COST,
  TEXT_WAS_PREFIX,
  TEXT_SAME_AS_LAST_DELIVERY,
  CHIP_COST_UP,
  CHIP_COST_DOWN,
  CHIP_NO_CHANGE,
} from "@/lib";
import { toReceivingLine, type DraftLine } from "../hooks";

const ROW_COLUMNS = "2fr 1fr 1fr 1fr auto";

function marginPercent(price: number, cost: number): number | null {
  return price > 0 ? Math.round(((price - cost) / price) * 100) : null;
}

interface ReceivingLinesTableProps {
  products: Product[];
  lines: DraftLine[];
  previousCostFor: (productId: string) => number | null;
  onUpdateLine: (productId: string, patch: Partial<DraftLine>) => void;
  onRemoveLine: (productId: string) => void;
}

export function ReceivingLinesTable({
  products,
  lines,
  previousCostFor,
  onUpdateLine,
  onRemoveLine,
}: ReceivingLinesTableProps) {
  if (lines.length === 0) return null;

  return (
    <div className="tpl-card" style={{ padding: 0, marginTop: 14 }}>
      <div className="tpl-thead" style={{ gridTemplateColumns: ROW_COLUMNS }}>
        <span>{TABLE_HEADER_PRODUCT}</span>
        <span>{TABLE_HEADER_QTY_RECEIVED}</span>
        <span>{TABLE_HEADER_COST_EACH}</span>
        <span>{TABLE_HEADER_NEW_STOCK}</span>
        <span />
      </div>
      {lines.map((line) => {
        const product = products.find((p) => p.id === line.productId);
        const preview = stockPreview(products, line.productId, Number(line.quantity) || 0);
        const costEach = Number(line.costEach) || 0;
        const previousCost = previousCostFor(line.productId);
        const changed = previousCost !== null && costEach !== previousCost;
        const direction = changed ? (costEach > previousCost! ? "up" : "down") : null;
        const marginBefore = previousCost !== null && product ? marginPercent(product.price, previousCost) : null;
        const marginAfter = product ? marginPercent(product.price, costEach) : null;

        return (
          <div key={line.productId} className="tpl-trow" style={{ gridTemplateColumns: ROW_COLUMNS, cursor: "default" }}>
            <div>
              <p className="tpl-sub" style={{ marginBottom: 2 }}>
                {line.productName}
              </p>
              {previousCost === null ? null : changed ? (
                <p className="tpl-hint">
                  {TEXT_WAS_PREFIX} {PESO.format(previousCost)}
                  {marginBefore !== null && marginAfter !== null ? ` · margin ${marginBefore}% → ${marginAfter}%` : ""}
                </p>
              ) : (
                <p className="tpl-hint">{TEXT_SAME_AS_LAST_DELIVERY}</p>
              )}
            </div>
            <div className="tpl-fld" style={{ marginBottom: 0 }}>
              <input
                type="number"
                min="1"
                value={line.quantity}
                onFocus={selectOnFocus}
                onChange={(e) => onUpdateLine(line.productId, { quantity: e.target.value })}
              />
            </div>
            <div>
              <div className="tpl-fld" style={{ marginBottom: 4 }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.costEach}
                  onFocus={selectOnFocus}
                  onChange={(e) => onUpdateLine(line.productId, { costEach: e.target.value })}
                />
              </div>
              {direction && (
                <span className={`tpl-chip${direction === "up" ? " tpl-w" : " tpl-g"}`} style={{ fontSize: 11 }}>
                  {direction === "up" ? CHIP_COST_UP : CHIP_COST_DOWN}
                </span>
              )}
              {previousCost !== null && !changed && (
                <span className="tpl-chip" style={{ fontSize: 11 }}>
                  {CHIP_NO_CHANGE}
                </span>
              )}
            </div>
            <span className="tpl-tp tpl-mono">{preview ? `${preview.old} → ${preview.next}` : "—"}</span>
            <button
              type="button"
              onClick={() => onRemoveLine(line.productId)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tpl-bad)" }}
            >
              <i className="ti ti-trash" aria-hidden />
              <span className="sr-only">{BUTTON_REMOVE}</span>
            </button>
          </div>
        );
      })}
      <div className="tpl-sp" style={{ padding: "12px 15px", borderTop: "0.5px solid var(--tpl-bd3)" }}>
        <span className="tpl-ts">{LABEL_TOTAL_COST}</span>
        <span className="tpl-tp tpl-mono" style={{ fontWeight: 600 }}>
          {PESO.format(receivingTotalCost(lines.map(toReceivingLine)))}
        </span>
      </div>
    </div>
  );
}
