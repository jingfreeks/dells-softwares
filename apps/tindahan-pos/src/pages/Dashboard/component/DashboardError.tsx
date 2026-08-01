export function DashboardError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {error}
    </div>
  );
}
