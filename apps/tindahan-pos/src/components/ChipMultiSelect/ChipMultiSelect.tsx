interface ChipMultiSelectOption {
  id: string;
  label: string;
}

interface ChipMultiSelectProps {
  options: ChipMultiSelectOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  /** Shows a checkmark inside selected chips — used for categories, not delivery days, in the reference design. */
  showCheckIcon?: boolean;
}

export function ChipMultiSelect({ options, selectedIds, onChange, showCheckIcon = false }: ChipMultiSelectProps) {
  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((existing) => existing !== id) : [...selectedIds, id]);
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((option) => {
        const on = selectedIds.includes(option.id);
        return (
          <span
            key={option.id}
            role="button"
            tabIndex={0}
            className={`tpl-chip${on ? " tpl-on" : ""}`}
            style={{ cursor: "pointer" }}
            onClick={() => toggle(option.id)}
            onKeyDown={(e) => e.key === "Enter" && toggle(option.id)}
          >
            {on && showCheckIcon && <i className="ti ti-check" aria-hidden style={{ marginRight: 4 }} />}
            {option.label}
          </span>
        );
      })}
    </div>
  );
}
