export function ScannerLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 shadow-xl">
        <span
          aria-hidden
          className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-[var(--color-brand)]"
        />
        <span className="text-sm font-medium text-slate-700">Loading camera…</span>
      </div>
    </div>
  );
}
