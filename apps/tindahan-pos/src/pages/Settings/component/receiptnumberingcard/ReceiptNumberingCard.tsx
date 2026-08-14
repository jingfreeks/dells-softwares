import {
  LABEL_RECEIPT_NUMBERING,
  TEXT_NEXT_RECEIPT_NUMBER_PREFIX,
  TEXT_RECEIPT_NUMBERING_MANAGED_AUTOMATICALLY,
} from "@/lib";

interface ReceiptNumberingCardProps {
  /** Null while loading, or before this store's first-ever sale (its numbering starts on that sale). */
  nextReceiptNumber: string | null;
}

export function ReceiptNumberingCard({ nextReceiptNumber }: ReceiptNumberingCardProps) {
  return (
    <div className="tpl-card">
      <div className="tpl-sp">
        <div className="tpl-flex1">
          <p className="tpl-tp">{LABEL_RECEIPT_NUMBERING}</p>
          <p className="tpl-ts">
            {TEXT_NEXT_RECEIPT_NUMBER_PREFIX} {nextReceiptNumber ?? "…"}
          </p>
          <p className="tpl-ts" style={{ marginTop: 4, color: "var(--tpl-t6)" }}>
            {TEXT_RECEIPT_NUMBERING_MANAGED_AUTOMATICALLY}
          </p>
        </div>
      </div>
    </div>
  );
}
