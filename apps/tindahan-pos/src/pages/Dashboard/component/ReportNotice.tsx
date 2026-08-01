export function ReportNotice({ notice }: { notice: string | null }) {
  if (!notice) return null;
  return (
    <p role="status" className="mt-2 text-xs text-slate-500">
      {notice}
    </p>
  );
}
