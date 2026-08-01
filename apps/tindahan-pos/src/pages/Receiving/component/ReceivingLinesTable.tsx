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
} from "@/lib";
import { toReceivingLine, type DraftLine } from "../hooks";

interface ReceivingLinesTableProps {
  products: Product[];
  lines: DraftLine[];
  onUpdateLine: (productId: string, patch: Partial<DraftLine>) => void;
  onRemoveLine: (productId: string) => void;
}

export function ReceivingLinesTable({ products, lines, onUpdateLine, onRemoveLine }: ReceivingLinesTableProps) {
  if (lines.length === 0) return null;

  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">{TABLE_HEADER_PRODUCT}</th>
            <th className="px-3 py-2">{TABLE_HEADER_QTY_RECEIVED}</th>
            <th className="px-3 py-2">{TABLE_HEADER_COST_EACH}</th>
            <th className="px-3 py-2">{TABLE_HEADER_NEW_STOCK}</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lines.map((line) => {
            const preview = stockPreview(products, line.productId, Number(line.quantity) || 0);
            return (
              <tr key={line.productId}>
                <td className="px-3 py-2 font-medium text-slate-800">{line.productName}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onFocus={selectOnFocus}
                    onChange={(e) => onUpdateLine(line.productId, { quantity: e.target.value })}
                    className="w-20 rounded-xl border border-slate-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.costEach}
                    onFocus={selectOnFocus}
                    onChange={(e) => onUpdateLine(line.productId, { costEach: e.target.value })}
                    className="w-24 rounded-xl border border-slate-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="tabular-nums px-3 py-2 font-medium text-[var(--color-brand)]">
                  {preview ? `${preview.old} → ${preview.next}` : "—"}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onRemoveLine(line.productId)}
                    className="cursor-pointer text-xs text-red-600 hover:underline"
                  >
                    {BUTTON_REMOVE}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-sm">
        <span className="text-slate-500">{LABEL_TOTAL_COST}</span>
        <span className="tabular-nums font-semibold text-slate-900">
          {PESO.format(receivingTotalCost(lines.map(toReceivingLine)))}
        </span>
      </div>
    </div>
  );
}
