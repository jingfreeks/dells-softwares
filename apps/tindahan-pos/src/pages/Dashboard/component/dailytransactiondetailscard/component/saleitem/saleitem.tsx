import { PESO } from "@/lib";
import type { SaleRecord } from "@/lib/types";
import { formatDateTime } from "../../lib";

const Saleperitemscreen = (props: { number: string; sale: SaleRecord }) => {
  const { number, sale } = props;
  return (
    <div className="tpl-sp" style={{ alignItems: "start" }}>
      <div>
        <p className="tpl-tp">Transaction #{number}</p>
        <p className="tpl-ts">
          Invoice INV-{number} · {formatDateTime(sale.timestamp)}
        </p>
      </div>
      <span className="tpl-tp">{PESO.format(sale.total)}</span>
    </div>
  );
};
export default Saleperitemscreen;
