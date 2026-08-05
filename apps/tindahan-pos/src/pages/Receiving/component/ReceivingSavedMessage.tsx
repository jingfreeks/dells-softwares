export function ReceivingSavedMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
      {message}
    </p>
  );
}
