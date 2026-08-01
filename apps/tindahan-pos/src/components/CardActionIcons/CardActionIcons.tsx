import {
  ARIA_DOWNLOAD_PREFIX,
  ARIA_AS_PDF_SUFFIX,
  LABEL_DOWNLOAD_PDF,
  LABEL_PRINT,
  LABEL_SHARE,
} from "@/lib";
import { DownloadIcon, PrintIcon, ShareIcon } from "@/components/icons";

export interface CardActions {
  onDownload?: () => void;
  onPrint?: () => void;
  onShare?: () => void;
}

/** Small download/print/share icon row shown on a dashboard card for exporting just that card. */
export function CardActionIcons({ title, onDownload, onPrint, onShare }: CardActions & { title: string }) {
  if (!onDownload && !onPrint && !onShare) return null;
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {onDownload && (
        <button
          type="button"
          onClick={onDownload}
          aria-label={`${ARIA_DOWNLOAD_PREFIX} ${title} ${ARIA_AS_PDF_SUFFIX}`}
          title={LABEL_DOWNLOAD_PDF}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <DownloadIcon className="h-4 w-4" />
        </button>
      )}
      {onPrint && (
        <button
          type="button"
          onClick={onPrint}
          aria-label={`${LABEL_PRINT} ${title}`}
          title={LABEL_PRINT}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <PrintIcon className="h-4 w-4" />
        </button>
      )}
      {onShare && (
        <button
          type="button"
          onClick={onShare}
          aria-label={`${LABEL_SHARE} ${title}`}
          title={LABEL_SHARE}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <ShareIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
