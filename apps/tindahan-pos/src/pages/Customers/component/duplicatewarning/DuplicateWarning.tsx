import type { Customer } from "@/lib";
import { PESO, TEXT_DUPLICATE_CUSTOMER_PREFIX, TEXT_DUPLICATE_CUSTOMER_SUFFIX, TEXT_DUPLICATE_CUSTOMER_WARNING, LINK_OPEN } from "@/lib";

interface DuplicateWarningProps {
  duplicate: Customer;
  onOpen: (customer: Customer) => void;
}

export function DuplicateWarning({ duplicate, onOpen }: DuplicateWarningProps) {
  return (
    <div className="tpl-note tpl-w" style={{ marginBottom: 14 }}>
      <i className="ti ti-info-circle" aria-hidden style={{ color: "var(--tpl-warn)" }} />
      <div className="tpl-flex1">
        <p className="tpl-nt" style={{ color: "var(--tpl-warn)" }}>
          {TEXT_DUPLICATE_CUSTOMER_PREFIX} "{duplicate.name}" {duplicate.balance > 0 ? `${PESO.format(duplicate.balance)} ${TEXT_DUPLICATE_CUSTOMER_SUFFIX}` : TEXT_DUPLICATE_CUSTOMER_SUFFIX}
        </p>
        <p className="tpl-ns" style={{ color: "#b08a2e" }}>{TEXT_DUPLICATE_CUSTOMER_WARNING}</p>
      </div>
      <button type="button" onClick={() => onOpen(duplicate)} className="tpl-lnk" style={{ alignSelf: "center" }}>
        {LINK_OPEN}
      </button>
    </div>
  );
}
