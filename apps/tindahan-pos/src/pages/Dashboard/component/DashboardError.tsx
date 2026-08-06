export function DashboardError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div role="alert" className="tpl-alert">
      {error}
    </div>
  );
}
