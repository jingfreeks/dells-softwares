import type { BestSeller } from "@/lib";

const Listitem = (props: { item: BestSeller; maxQuantity: number }) => {
  const { item, maxQuantity } = props;
  return (
    <div key={item.name} style={{ marginBottom: 11 }}>
      <div className="tpl-sp" style={{ marginBottom: 5 }}>
        <span style={{ color: "var(--tpl-t3)", fontSize: 13 }}>
          {item.name}
        </span>
        <span className="tpl-ts">{item.quantity}</span>
      </div>
      <div className="tpl-bar">
        <i style={{ width: `${(item.quantity / maxQuantity) * 100}%` }} />
      </div>
    </div>
  );
};
export default Listitem;
