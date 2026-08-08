import { useEffect, useRef } from "react";

interface PinKeypadProps {
  /** Number of digits the PIN should have. Defaults to 4. */
  length?: number;
  value: string;
  onChange: (value: string) => void;
  /** Called once, with the full PIN, the instant `value` reaches `length` digits. */
  onSubmit?: (value: string) => void;
  disabled?: boolean;
  ariaLabel: string;
}

const DIGIT_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

export function PinKeypad({ length = 4, value, onChange, onSubmit, disabled, ariaLabel }: PinKeypadProps) {
  const submittedRef = useRef(false);

  useEffect(() => {
    if (value.length === length && !submittedRef.current) {
      submittedRef.current = true;
      onSubmit?.(value);
    }
    if (value.length < length) {
      submittedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, length]);

  function pressDigit(digit: string) {
    if (disabled || value.length >= length) return;
    onChange(value + digit);
  }

  function pressBackspace() {
    if (disabled || value.length === 0) return;
    onChange(value.slice(0, -1));
  }

  return (
    <div>
      <div className="tpl-dots" role="status" aria-label={ariaLabel}>
        {Array.from({ length }, (_, i) => (
          <span key={i} className={`tpl-dot${i < value.length ? " tpl-on" : ""}`} />
        ))}
      </div>
      <div className="tpl-kp">
        {DIGIT_ROWS.flat().map((digit) => (
          <button
            key={digit}
            type="button"
            className="tpl-kp-key"
            onClick={() => pressDigit(digit)}
            disabled={disabled}
          >
            {digit}
          </button>
        ))}
        <div className="tpl-kp-blank" aria-hidden />
        <button type="button" className="tpl-kp-key" onClick={() => pressDigit("0")} disabled={disabled}>
          0
        </button>
        <button
          type="button"
          className="tpl-kp-key"
          onClick={pressBackspace}
          disabled={disabled || value.length === 0}
          aria-label="Backspace"
        >
          <i className="ti ti-backspace" aria-hidden />
        </button>
      </div>
    </div>
  );
}
