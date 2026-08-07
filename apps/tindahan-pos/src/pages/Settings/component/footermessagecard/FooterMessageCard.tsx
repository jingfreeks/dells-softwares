import { LABEL_FOOTER_MESSAGE, TEXT_CHARACTERS_LEFT } from "@/lib";

interface FooterMessageCardProps {
  footerMessage: string;
  onFooterMessageChange: (value: string) => void;
  charactersLeft: number;
}

export function FooterMessageCard({ footerMessage, onFooterMessageChange, charactersLeft }: FooterMessageCardProps) {
  return (
    <div className="tpl-card" style={{ marginBottom: 11 }}>
      <label htmlFor="receiptFooterMessage" className="tpl-lbl">
        {LABEL_FOOTER_MESSAGE}
      </label>
      <div className="tpl-fld">
        <input
          id="receiptFooterMessage"
          type="text"
          value={footerMessage}
          onChange={(e) => onFooterMessageChange(e.target.value)}
        />
      </div>
      <p className="tpl-hint">
        {charactersLeft} {TEXT_CHARACTERS_LEFT}
      </p>
    </div>
  );
}
