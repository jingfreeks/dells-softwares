import { PESO, TEXT_SALE_RECORDED_PREFIX, TEXT_SALE_RECORDED_SUFFIX, TEXT_SERVICES_NOTICE } from "@/lib";

interface CheckoutStatusMessagesProps {
  lastReceiptTotal: number | null;
  checkoutError: string | null;
  holdError?: string | null;
  hasServiceLines: boolean;
}

export function CheckoutStatusMessages({
  lastReceiptTotal,
  checkoutError,
  holdError,
  hasServiceLines,
}: CheckoutStatusMessagesProps) {
  return (
    <>
      {lastReceiptTotal !== null && (
        <p role="status" className="tpl-note tpl-g" style={{ marginTop: 14, color: "var(--tpl-okd)", fontSize: 13 }}>
          {TEXT_SALE_RECORDED_PREFIX} {PESO.format(lastReceiptTotal)}
          {TEXT_SALE_RECORDED_SUFFIX}
        </p>
      )}

      {checkoutError && (
        <p role="alert" className="tpl-alert" style={{ marginTop: 14, marginBottom: 0 }}>
          {checkoutError}
        </p>
      )}

      {holdError && (
        <p role="alert" className="tpl-alert" style={{ marginTop: 14, marginBottom: 0 }}>
          {holdError}
        </p>
      )}

      {hasServiceLines && (
        <p className="tpl-status-note" style={{ marginTop: 14 }}>
          {TEXT_SERVICES_NOTICE}
        </p>
      )}
    </>
  );
}
