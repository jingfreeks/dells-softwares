import {
  LABEL_REGISTERED_WITH_BIR,
  TEXT_REGISTERED_WITH_BIR_DESC,
  LABEL_TIN,
  LABEL_BUSINESS_PERMIT_NO,
  TEXT_BIR_HINT,
} from "@/lib";

interface BirRegistrationCardProps {
  birRegistered: boolean;
  onToggleBirRegistered: () => void;
  tin: string;
  onTinChange: (value: string) => void;
  businessPermitNo: string;
  onBusinessPermitNoChange: (value: string) => void;
}

export function BirRegistrationCard({
  birRegistered,
  onToggleBirRegistered,
  tin,
  onTinChange,
  businessPermitNo,
  onBusinessPermitNoChange,
}: BirRegistrationCardProps) {
  return (
    <div className="tpl-card" style={{ marginBottom: 18 }}>
      <div className="tpl-sp" style={{ marginBottom: 11 }}>
        <div className="tpl-flex1">
          <p className="tpl-h3">{LABEL_REGISTERED_WITH_BIR}</p>
          <p className="tpl-ts">{TEXT_REGISTERED_WITH_BIR_DESC}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={birRegistered}
          aria-label={LABEL_REGISTERED_WITH_BIR}
          onClick={onToggleBirRegistered}
          className={`tpl-tog${birRegistered ? " tpl-on" : ""}`}
        >
          <span />
        </button>
      </div>

      <div className="tpl-g2">
        <div>
          <label htmlFor="storeTin" className="tpl-lbl">
            {LABEL_TIN}
          </label>
          <div className="tpl-fld tpl-mono">
            <input id="storeTin" type="text" value={tin} onChange={(e) => onTinChange(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="storeBusinessPermitNo" className="tpl-lbl">
            {LABEL_BUSINESS_PERMIT_NO}
          </label>
          <div className="tpl-fld tpl-mono">
            <input
              id="storeBusinessPermitNo"
              type="text"
              value={businessPermitNo}
              onChange={(e) => onBusinessPermitNoChange(e.target.value)}
            />
          </div>
        </div>
      </div>
      <p className="tpl-hint">{TEXT_BIR_HINT}</p>
    </div>
  );
}
