import { PrintIcon } from "./icons";

/** Header for a dashboard list card, with an optional print icon that exports just that card. */
export function SectionCardHeader({ title, onPrint }: { title: string; onPrint?: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 p-4">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {onPrint && (
        <button
          type="button"
          onClick={onPrint}
          aria-label={`Print ${title}`}
          title="Print"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <PrintIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
