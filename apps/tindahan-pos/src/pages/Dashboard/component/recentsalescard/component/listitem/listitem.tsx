import type { SaleRecord } from "@/lib";
import { PESO } from "@/lib";
import { useRecentsalescard } from "../../hooks";

const Lititem = (props: { sale: SaleRecord }) => {
  const { sale } = props;
  const { formatSaleDate, formatItems, PAYMENT_LABEL } = useRecentsalescard();
  return (
    <div className="tpl-lr" key={sale.id}>
      <div className="tpl-flex1">
        <p className="tpl-tp">{formatItems(sale)}</p>
        <p className="tpl-ts">
          {formatSaleDate(sale.timestamp)} · {PAYMENT_LABEL[sale.paymentType]}
        </p>
      </div>
      <span className="tpl-tp">{PESO.format(sale.total)}</span>
    </div>
  );
};
export default Lititem;
