import { PESO } from "@/lib";

const Totalsalescreen=(props:{ subtotal: number; totalItemsSold: number })=>{
    const { subtotal, totalItemsSold } = props;
    return(
      <div className="tpl-sp" style={{ borderTop: "1px solid var(--tpl-b)", marginTop: 14, paddingTop: 12 }}>
        <span className="tpl-ts">Transaction subtotal: {PESO.format(subtotal)} · Total items sold: {totalItemsSold}</span>
        <strong>Grand total: {PESO.format(subtotal)}</strong>
      </div>
    )
}
export default Totalsalescreen;