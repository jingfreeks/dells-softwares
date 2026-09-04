import {
  LABEL_PRINT_AND_PHOTOCOPY,
  LABEL_PRINT_BW,
  LABEL_PRINT_COLOUR,
  LABEL_PHOTOCOPY,
  LABEL_BULK_FROM,
  TEXT_PRINT_PRICES_NOT_ENFORCED,
} from "@/lib";
import { NotEnforcedNote } from "../notenforcednote";

interface PrintPhotocopyCardProps {
  printBw: number;
  onPrintBwChange: (value: number) => void;
  printColour: number;
  onPrintColourChange: (value: number) => void;
  photocopy: number;
  onPhotocopyChange: (value: number) => void;
  bulkFromPages: number;
  onBulkFromPagesChange: (value: number) => void;
}

export function PrintPhotocopyCard({
  printBw,
  onPrintBwChange,
  printColour,
  onPrintColourChange,
  photocopy,
  onPhotocopyChange,
  bulkFromPages,
  onBulkFromPagesChange,
}: PrintPhotocopyCardProps) {
  return (
    <div className="tpl-card" style={{ marginBottom: 11 }}>
      <p className="tpl-h3" style={{ marginBottom: 11 }}>
        {LABEL_PRINT_AND_PHOTOCOPY}
      </p>
      <div className="tpl-g4">
        <div>
          <label htmlFor="feesPrintBw" className="tpl-lbl">
            {LABEL_PRINT_BW}
          </label>
          <div className="tpl-fld tpl-mono">
            <input
              id="feesPrintBw"
              type="number"
              min={0}
              step="0.01"
              value={printBw}
              onChange={(e) => onPrintBwChange(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <div>
          <label htmlFor="feesPrintColour" className="tpl-lbl">
            {LABEL_PRINT_COLOUR}
          </label>
          <div className="tpl-fld tpl-mono">
            <input
              id="feesPrintColour"
              type="number"
              min={0}
              step="0.01"
              value={printColour}
              onChange={(e) => onPrintColourChange(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <div>
          <label htmlFor="feesPhotocopy" className="tpl-lbl">
            {LABEL_PHOTOCOPY}
          </label>
          <div className="tpl-fld tpl-mono">
            <input
              id="feesPhotocopy"
              type="number"
              min={0}
              step="0.01"
              value={photocopy}
              onChange={(e) => onPhotocopyChange(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <div>
          <label htmlFor="feesBulkFrom" className="tpl-lbl">
            {LABEL_BULK_FROM}
          </label>
          <div className="tpl-fld tpl-mono">
            <input
              id="feesBulkFrom"
              type="number"
              min={1}
              value={bulkFromPages}
              onChange={(e) => onBulkFromPagesChange(Number(e.target.value) || 1)}
            />
          </div>
        </div>
      </div>
      <NotEnforcedNote>{TEXT_PRINT_PRICES_NOT_ENFORCED}</NotEnforcedNote>
    </div>
  );
}
