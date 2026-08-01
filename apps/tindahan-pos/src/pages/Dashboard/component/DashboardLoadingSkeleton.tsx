export function DashboardLoadingSkeleton() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[84px] animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
      ))}
    </div>
  );
}
