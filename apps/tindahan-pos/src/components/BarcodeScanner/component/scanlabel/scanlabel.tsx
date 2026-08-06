import {
  LABEL_SCAN_BARCODE,
  ARIA_CLOSE_SCANNER,
} from "@/lib";
const Scanlabel = ({ onClose }: { onClose:() => void; }) => {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold text-slate-900">
        {LABEL_SCAN_BARCODE}
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label={ARIA_CLOSE_SCANNER}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-5 w-5"
          aria-hidden
        >
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};

export default Scanlabel;