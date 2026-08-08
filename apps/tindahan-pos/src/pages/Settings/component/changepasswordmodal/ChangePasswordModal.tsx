import type { FormEvent } from "react";
import {
  LABEL_CHANGE_PASSWORD_HEADING,
  LABEL_NEW_PASSWORD,
  LABEL_CONFIRM_NEW_PASSWORD,
  BUTTON_CANCEL,
  BUTTON_UPDATE_PASSWORD,
  BUTTON_UPDATING,
  TEXT_PASSWORD_UPDATED,
} from "@/lib";

interface ChangePasswordModalProps {
  open: boolean;
  newPassword: string;
  onNewPasswordChange: (value: string) => void;
  confirmNewPassword: string;
  onConfirmNewPasswordChange: (value: string) => void;
  passwordError: string | null;
  passwordSaved: boolean;
  updatingPassword: boolean;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
}

export function ChangePasswordModal({
  open,
  newPassword,
  onNewPasswordChange,
  confirmNewPassword,
  onConfirmNewPasswordChange,
  passwordError,
  passwordSaved,
  updatingPassword,
  onCancel,
  onSubmit,
}: ChangePasswordModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">{LABEL_CHANGE_PASSWORD_HEADING}</h2>

        <form className="mt-4 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <div>
            <label htmlFor="newPassword" className="text-xs font-medium text-slate-700">
              {LABEL_NEW_PASSWORD}
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => onNewPasswordChange(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
          <div>
            <label htmlFor="confirmNewPassword" className="text-xs font-medium text-slate-700">
              {LABEL_CONFIRM_NEW_PASSWORD}
            </label>
            <input
              id="confirmNewPassword"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => onConfirmNewPasswordChange(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>

          {passwordError && (
            <p role="alert" className="text-sm text-red-600">
              {passwordError}
            </p>
          )}
          {passwordSaved && (
            <p role="status" className="text-sm text-emerald-600">
              {TEXT_PASSWORD_UPDATED}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={updatingPassword}
              className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {BUTTON_CANCEL}
            </button>
            <button
              type="submit"
              disabled={updatingPassword}
              className="cursor-pointer rounded-xl bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updatingPassword ? BUTTON_UPDATING : BUTTON_UPDATE_PASSWORD}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
