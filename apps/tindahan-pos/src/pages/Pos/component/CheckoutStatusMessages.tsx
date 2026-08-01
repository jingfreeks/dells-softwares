import { PESO, TEXT_SALE_RECORDED_PREFIX, TEXT_SALE_RECORDED_SUFFIX, TEXT_SERVICES_NOTICE } from "@/lib";

interface CheckoutStatusMessagesProps {
  lastReceiptTotal: number | null;
  checkoutError: string | null;
  hasServiceLines: boolean;
}

export function CheckoutStatusMessages({ lastReceiptTotal, checkoutError, hasServiceLines }: CheckoutStatusMessagesProps) {
  return (
    <>
      {lastReceiptTotal !== null && (
        <p role="status" className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {TEXT_SALE_RECORDED_PREFIX} {PESO.format(lastReceiptTotal)}
          {TEXT_SALE_RECORDED_SUFFIX}
        </p>
      )}

      {checkoutError && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {checkoutError}
        </p>
      )}

      {hasServiceLines && (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">{TEXT_SERVICES_NOTICE}</p>
      )}
    </>
  );
}
