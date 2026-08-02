export function DashboardLoadingSkeleton() {
  return (
    <div className="tpl-g4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="tpl-skel" />
      ))}
    </div>
  );
}
