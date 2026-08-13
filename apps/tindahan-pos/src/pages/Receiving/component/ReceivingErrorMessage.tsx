export function ReceivingErrorMessage({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="tpl-emsg" style={{ marginTop: 10 }}>
      <i className="ti ti-alert-circle" aria-hidden />
      {error}
    </p>
  );
}
