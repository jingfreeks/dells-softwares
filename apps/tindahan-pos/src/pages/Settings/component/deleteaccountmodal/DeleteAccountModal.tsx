import {
  LABEL_DELETE_ACCOUNT_CONFIRM_HEADING,
  TEXT_DELETE_ACCOUNT_MODAL_BODY,
  BUTTON_CANCEL,
  BUTTON_DELETING,
  BUTTON_DELETE_MY_ACCOUNT,
} from "@/lib";

interface DeleteAccountModalProps {
  open: boolean;
  deleteError: string | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteAccountModal({ open, deleteError, deleting, onCancel, onConfirm }: DeleteAccountModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">{LABEL_DELETE_ACCOUNT_CONFIRM_HEADING}</h2>
        <p className="mt-2 text-sm text-slate-600">{TEXT_DELETE_ACCOUNT_MODAL_BODY}</p>

        {deleteError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {deleteError}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {BUTTON_CANCEL}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? BUTTON_DELETING : BUTTON_DELETE_MY_ACCOUNT}
          </button>
        </div>
      </div>
    </div>
  );
}
