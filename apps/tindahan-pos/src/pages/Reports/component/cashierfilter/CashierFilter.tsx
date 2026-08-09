import { LABEL_ALL_CASHIERS } from "@/lib";

interface CashierOption {
  id: string;
  name: string;
}

interface CashierFilterProps {
  cashiers: CashierOption[];
  cashierId: string | null;
  onChange: (cashierId: string | null) => void;
}

export function CashierFilter({ cashiers, cashierId, onChange }: CashierFilterProps) {
  return (
    <div className="tpl-fld" style={{ padding: "0 10px", width: "auto" }}>
      <select
        aria-label={LABEL_ALL_CASHIERS}
        value={cashierId ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">{LABEL_ALL_CASHIERS}</option>
        {cashiers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
