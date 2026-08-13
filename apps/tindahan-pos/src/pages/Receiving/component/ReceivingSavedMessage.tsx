export function ReceivingSavedMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="status" className="tpl-ts tpl-ok" style={{ marginTop: 12 }}>
      <i className="ti ti-circle-check" aria-hidden style={{ marginRight: 4 }} />
      {message}
    </p>
  );
}
