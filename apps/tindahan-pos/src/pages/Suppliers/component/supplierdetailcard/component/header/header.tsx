import { EMPTY_STATE_NO_PHONE, BUTTON_EDIT } from "@/lib";
import type { Supplier } from "@/lib";

interface HeaderscreenProps {
  supplier: Supplier;
  onClick: () => void;
}

const Headerscreen = (props: HeaderscreenProps) => {
  const { supplier, onClick } = props;
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">
          {supplier.name}
        </h2>
        <p className="text-xs text-slate-500">
          {supplier.phone ?? EMPTY_STATE_NO_PHONE}
        </p>
        {supplier.address && (
          <p className="text-xs text-slate-500">{supplier.address}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClick}
        className="cursor-pointer text-xs font-medium text-[var(--color-brand)] hover:underline"
      >
        {BUTTON_EDIT}
      </button>
    </div>
  );
};
export default Headerscreen;
