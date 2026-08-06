import type { SaleRecord } from "@/lib";

const Headerscreen=(props:{ sales: SaleRecord[] })=>{
    const { sales } = props;
    return(
      <div className="tpl-sp" style={{ marginBottom: 12 }}>
        <p className="tpl-h3">Daily sales transactions</p>
        <span className="tpl-ts">{sales.length} transaction{sales.length === 1 ? "" : "s"}</span>
      </div>
    )
}
export default Headerscreen;