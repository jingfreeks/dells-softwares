import { LABEL_DRAWER_COUNTING_TITLE, TEXT_DRAWER_COUNTING_DESC } from "@/lib";

interface DrawerCountingToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export function DrawerCountingToggle({ value, onChange }: DrawerCountingToggleProps) {
  return (
    <div className="tpl-card" style={{ background: "var(--tpl-gl3)", marginBottom: 18 }}>
      <div className="tpl-sp">
        <div className="tpl-flex1">
          <p className="tpl-tp">{LABEL_DRAWER_COUNTING_TITLE}</p>
          <p className="tpl-ts">{TEXT_DRAWER_COUNTING_DESC}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value}
          aria-label={LABEL_DRAWER_COUNTING_TITLE}
          onClick={() => onChange(!value)}
          className={`tpl-tog${value ? " tpl-on" : ""}`}
        >
          <span />
        </button>
      </div>
    </div>
  );
}
