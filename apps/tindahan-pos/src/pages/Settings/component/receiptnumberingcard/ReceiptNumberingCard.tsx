import { useState } from "react";
import { LABEL_RECEIPT_NUMBERING, TEXT_NEXT_RECEIPT_NUMBER_PREFIX, BUTTON_EDIT, BUTTON_SAVE } from "@/lib";

interface ReceiptNumberingCardProps {
  nextReceiptNumber: string;
  onNextReceiptNumberChange: (value: string) => void;
}

export function ReceiptNumberingCard({ nextReceiptNumber, onNextReceiptNumberChange }: ReceiptNumberingCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(nextReceiptNumber);

  if (editing) {
    return (
      <div className="tpl-card">
        <div className="tpl-sp">
          <div className="tpl-flex1">
            <p className="tpl-tp">{LABEL_RECEIPT_NUMBERING}</p>
            <div className="tpl-fld" style={{ marginTop: 5 }}>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label={LABEL_RECEIPT_NUMBERING}
              />
            </div>
          </div>
          <button
            type="button"
            className="tpl-btn"
            style={{ width: "auto", height: 32, padding: "0 14px", marginBottom: 0 }}
            onClick={() => {
              onNextReceiptNumberChange(draft);
              setEditing(false);
            }}
          >
            {BUTTON_SAVE}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tpl-card">
      <div className="tpl-sp">
        <div className="tpl-flex1">
          <p className="tpl-tp">{LABEL_RECEIPT_NUMBERING}</p>
          <p className="tpl-ts">
            {TEXT_NEXT_RECEIPT_NUMBER_PREFIX} {nextReceiptNumber}
          </p>
        </div>
        <button
          type="button"
          className="tpl-btn"
          style={{ width: "auto", height: 32, padding: "0 14px", marginBottom: 0 }}
          onClick={() => {
            setDraft(nextReceiptNumber);
            setEditing(true);
          }}
        >
          {BUTTON_EDIT}
        </button>
      </div>
    </div>
  );
}
