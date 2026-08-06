import { BUTTON_ADD_CUSTOMER, NAV_LABEL_CUSTOMERS, TEXT_CUSTOMERS_DESCRIPTION } from "@/lib";

export function CustomersHeader({ onAddCustomer }: { onAddCustomer: () => void }) {
  return (
    <div className="tpl-hd">
      <div>
        <h1 className="tpl-h1">{NAV_LABEL_CUSTOMERS}</h1>
        <p className="tpl-sub">{TEXT_CUSTOMERS_DESCRIPTION}</p>
      </div>
      <button
        type="button"
        onClick={onAddCustomer}
        className="tpl-btnp"
        style={{ width: "auto", height: 36, padding: "0 14px", fontSize: 13, marginBottom: 0 }}
      >
        <i className="ti ti-plus" aria-hidden /> {BUTTON_ADD_CUSTOMER}
      </button>
    </div>
  );
}
