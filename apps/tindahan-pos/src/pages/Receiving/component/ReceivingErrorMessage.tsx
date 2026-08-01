export function ReceivingErrorMessage({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-3 text-sm text-red-600">
      {error}
    </p>
  );
}
