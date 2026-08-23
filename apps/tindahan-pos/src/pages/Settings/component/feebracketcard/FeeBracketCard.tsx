import { LABEL_ADD_BRACKET, TEXT_BRACKET_UP_TO_PREFIX, TEXT_BRACKET_AND_UP_SUFFIX, BUTTON_REMOVE, PESO, type FeeBracket } from "@/lib";

interface FeeBracketCardProps {
  title: string;
  brackets: FeeBracket[];
  onFeeChange: (index: number, fee: number) => void;
  onMaxChange: (index: number, max: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export function FeeBracketCard({ title, brackets, onFeeChange, onMaxChange, onAdd, onRemove }: FeeBracketCardProps) {
  return (
    <div className="tpl-card">
      <div className="tpl-sp" style={{ marginBottom: 11 }}>
        <p className="tpl-h3">{title}</p>
        <button type="button" className="tpl-lnk" onClick={onAdd}>
          {LABEL_ADD_BRACKET}
        </button>
      </div>
      {brackets.map((bracket, index) => {
        const min = index === 0 ? 1 : brackets[index - 1].max + 1;
        const isLast = index === brackets.length - 1;
        const rangeLabel = isLast
          ? `${PESO.format(min).replace(".00", "")} ${TEXT_BRACKET_AND_UP_SUFFIX}`
          : `${PESO.format(min).replace(".00", "")} – ${bracket.max}`;

        return (
          <div
            key={index}
            className="tpl-sp"
            style={{ padding: "6px 0", borderBottom: index < brackets.length - 1 ? "0.5px solid var(--tpl-bd3)" : "none" }}
          >
            <span style={{ color: "var(--tpl-t4)", fontSize: 13 }} title={isLast ? undefined : `${TEXT_BRACKET_UP_TO_PREFIX} ${bracket.max}`}>
              {rangeLabel}
            </span>
            <div className="tpl-row" style={{ gap: 6 }}>
              {!isLast && (
                <div className="tpl-fld tpl-mono" style={{ height: 28, padding: "0 11px", width: 70, justifyContent: "center" }}>
                  <input
                    type="number"
                    min={min}
                    value={bracket.max}
                    onChange={(e) => onMaxChange(index, Number(e.target.value) || 0)}
                    aria-label={`${TEXT_BRACKET_UP_TO_PREFIX} ${rangeLabel}`}
                    style={{ textAlign: "center" }}
                  />
                </div>
              )}
              <div className="tpl-fld tpl-mono" style={{ height: 28, padding: "0 11px", width: 70, justifyContent: "center" }}>
                <input
                  type="number"
                  min={0}
                  value={bracket.fee}
                  onChange={(e) => onFeeChange(index, Number(e.target.value) || 0)}
                  aria-label={rangeLabel}
                  style={{ textAlign: "center" }}
                />
              </div>
              {brackets.length > 1 && (
                <button
                  type="button"
                  aria-label={`${BUTTON_REMOVE} ${rangeLabel}`}
                  onClick={() => onRemove(index)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--tpl-t6)", fontSize: 16 }}
                >
                  <i className="ti ti-x" aria-hidden />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
