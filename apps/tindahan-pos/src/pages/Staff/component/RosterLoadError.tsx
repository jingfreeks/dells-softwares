export function RosterLoadError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="px-4 pt-4 text-sm text-red-600">
      {error}
    </p>
  );
}
