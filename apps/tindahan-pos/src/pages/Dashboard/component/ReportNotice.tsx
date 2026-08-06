export function ReportNotice({ notice }: { notice: string | null }) {
  if (!notice) return null;
  return (
    <p role="status" className="tpl-status-note">
      {notice}
    </p>
  );
}
