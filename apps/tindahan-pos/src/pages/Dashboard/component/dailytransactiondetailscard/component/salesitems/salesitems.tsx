import { PESO, type SaleRecord } from "@/lib";
import { PAYMENT_LABEL } from "../../lib";

interface SalesperitemsscreenProps {
  sale: SaleRecord;
  customerNameById: Map<string, string>;
}

const Salesperitemsscreen = (props: SalesperitemsscreenProps) => {
  const { sale, customerNameById } = props;
  return (
    <>
      <p className="tpl-ts" style={{ marginTop: 6 }}>
        Cashier: {sale.cashierName} · Customer:{" "}
        {sale.customerId
          ? (customerNameById.get(sale.customerId) ?? "Unknown")
          : "Walk-in"}{" "}
        · {PAYMENT_LABEL[sale.paymentType]} · Status: Completed
      </p>
      <p className="tpl-ts" style={{ marginTop: 4 }}>
        Discount: {PESO.format(0)} · Tax: {PESO.format(0)}
      </p>
      <div className="tpl-ts" style={{ marginTop: 9 }}>
        {sale.items.map((item) => (
          <div
            key={`${sale.id}-${item.productId}-${item.name}`}
            className="tpl-sp"
            style={{ gap: 12 }}
          >
            <span>
              {item.name} · SKU: {item.productId || "—"} · {item.quantity} ×{" "}
              {PESO.format(item.price)}
            </span>
            <span>{PESO.format(item.lineTotal)}</span>
          </div>
        ))}
      </div>
    </>
  );
};
export default Salesperitemsscreen;
