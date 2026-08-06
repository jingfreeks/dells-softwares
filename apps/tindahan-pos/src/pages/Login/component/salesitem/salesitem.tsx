interface SalePreviewItem {
  icon: string;
  tone: string;
  title: string;
  meta: string;
  amount: string;
}

const Salesitem = ({ sale }: { sale: SalePreviewItem }) => {
  return (
    <div className="tpl-lr" key={sale.title}>
      <span className={`tpl-ic ${sale.tone}`}>
        <i className={`ti ${sale.icon}`} aria-hidden />
      </span>
      <div className="tpl-flex1">
        <p className="tpl-tp">{sale.title}</p>
        <p className="tpl-ts">{sale.meta}</p>
      </div>
      <span className="tpl-tp">{sale.amount}</span>
    </div>
  );
};
export default Salesitem;
