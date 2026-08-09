import { LABEL_OPENING_HOURS, TEXT_SAME_EVERY_DAY, LABEL_OPENS, LABEL_CLOSES, TEXT_OPENING_HOURS_STOCK_HINT } from "@/lib";

const DAY_ABBREVIATIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface OpeningHoursCardProps {
  openTime: string;
  onOpenTimeChange: (value: string) => void;
  closeTime: string;
  onCloseTimeChange: (value: string) => void;
}

export function OpeningHoursCard({ openTime, onOpenTimeChange, closeTime, onCloseTimeChange }: OpeningHoursCardProps) {
  return (
    <div className="tpl-card" style={{ marginBottom: 11 }}>
      <div className="tpl-sp" style={{ marginBottom: 11 }}>
        <p className="tpl-h3">{LABEL_OPENING_HOURS}</p>
        <span className="tpl-lnk">{TEXT_SAME_EVERY_DAY}</span>
      </div>

      <div className="tpl-row" style={{ gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {DAY_ABBREVIATIONS.map((day) => (
          <span key={day} className="tpl-chip tpl-on">
            {day}
          </span>
        ))}
      </div>

      <div className="tpl-g2">
        <div>
          <label htmlFor="storeOpensAt" className="tpl-lbl">
            {LABEL_OPENS}
          </label>
          <div className="tpl-fld">
            <input
              id="storeOpensAt"
              type="time"
              value={openTime}
              onChange={(e) => onOpenTimeChange(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label htmlFor="storeClosesAt" className="tpl-lbl">
            {LABEL_CLOSES}
          </label>
          <div className="tpl-fld">
            <input
              id="storeClosesAt"
              type="time"
              value={closeTime}
              onChange={(e) => onCloseTimeChange(e.target.value)}
            />
          </div>
        </div>
      </div>
      <p className="tpl-hint">{TEXT_OPENING_HOURS_STOCK_HINT}</p>
    </div>
  );
}
