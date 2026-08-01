import {
  LABEL_DAILY_SALES_REPORT,
  TEXT_DAILY_REPORT_DESCRIPTION,
  ARIA_DOWNLOAD_REPORT,
  LABEL_DOWNLOAD_PDF,
  ARIA_PRINT_REPORT,
  LABEL_PRINT,
  ARIA_SHARE_REPORT,
  LABEL_SHARE,
} from "@/lib";
import { DocumentReportIcon, DownloadIcon, PrintIcon, ShareIcon } from "@/components";

type ReportAction = "download" | "print" | "share" | null;

interface DailyReportCardProps {
  reportAction: ReportAction;
  onDownload: () => void;
  onPrint: () => void;
  onShare: () => void;
}

export function DailyReportCard({ reportAction, onDownload, onPrint, onShare }: DailyReportCardProps) {
  return (
    <div className="mt-4 flex flex-col gap-3 card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand)]/10 text-[var(--color-brand)]">
          <DocumentReportIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{LABEL_DAILY_SALES_REPORT}</p>
          <p className="text-xs text-slate-500">{TEXT_DAILY_REPORT_DESCRIPTION}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDownload}
          disabled={reportAction !== null}
          aria-label={ARIA_DOWNLOAD_REPORT}
          title={LABEL_DOWNLOAD_PDF}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <DownloadIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onPrint}
          disabled={reportAction !== null}
          aria-label={ARIA_PRINT_REPORT}
          title={LABEL_PRINT}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PrintIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onShare}
          disabled={reportAction !== null}
          aria-label={ARIA_SHARE_REPORT}
          title={LABEL_SHARE}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShareIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
