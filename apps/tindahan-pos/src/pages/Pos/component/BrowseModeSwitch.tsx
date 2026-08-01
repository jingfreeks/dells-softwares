import { LABEL_SHORTCUT_F2, LABEL_SHORTCUT_F3, LABEL_SCAN_BARCODE, LABEL_SEARCH_BY_NAME_TAB, LABEL_NO_BARCODE_QUICK_ITEMS } from "@/lib";
import type { BrowseMode } from "../hooks";

interface BrowseModeSwitchProps {
  browseMode: BrowseMode;
  onScanMode: () => void;
  onSearchMode: () => void;
  onQuickMode: () => void;
}

export function BrowseModeSwitch({ browseMode, onScanMode, onSearchMode, onQuickMode }: BrowseModeSwitchProps) {
  return (
    <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
      <button
        type="button"
        onClick={onScanMode}
        title={LABEL_SHORTCUT_F2}
        className={`flex-1 cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
          browseMode === "scan" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
        }`}
      >
        {LABEL_SCAN_BARCODE} <span className="text-slate-400">(F2)</span>
      </button>
      <button
        type="button"
        onClick={onSearchMode}
        title={LABEL_SHORTCUT_F3}
        className={`flex-1 cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
          browseMode === "search" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
        }`}
      >
        {LABEL_SEARCH_BY_NAME_TAB} <span className="text-slate-400">(F3)</span>
      </button>
      <button
        type="button"
        onClick={onQuickMode}
        className={`flex-1 cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
          browseMode === "quick" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
        }`}
      >
        {LABEL_NO_BARCODE_QUICK_ITEMS}
      </button>
    </div>
  );
}
