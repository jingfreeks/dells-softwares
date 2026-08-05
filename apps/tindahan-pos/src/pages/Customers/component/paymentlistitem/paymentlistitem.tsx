import {
  PESO,
  TEXT_RECORDED_BY_PREFIX,
} from "@/lib";

const Paymentlistitem = (props:{ payment: any }) => {
    const { payment } = props;
  return (
    <li key={payment.id} className="px-4 py-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="tabular-nums font-medium text-slate-900">
          {PESO.format(payment.amount)}
        </span>
        <span className="text-xs text-slate-500">
          {new Date(payment.timestamp).toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>
      <p className="text-xs text-slate-500">
        {payment.note ? `${payment.note} · ` : ""}
        {TEXT_RECORDED_BY_PREFIX} {payment.createdByName}
      </p>
    </li>
  );
};
export default Paymentlistitem;
