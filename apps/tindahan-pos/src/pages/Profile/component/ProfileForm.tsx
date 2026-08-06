import type { ChangeEvent, FormEvent } from "react";
import {
  LABEL_NAME,
  LABEL_PHONE_OPTIONAL,
  LABEL_EMAIL,
  LABEL_ROLE,
  TEXT_PROFILE_UPDATED,
  BUTTON_SAVING,
  BUTTON_SAVE_CHANGES,
} from "@/lib";
import { AvatarField } from "./AvatarField";

interface ProfileFormProps {
  displayedAvatar: string | null | undefined;
  processingImage: boolean;
  imageError: string | null;
  onImageSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
  name: string;
  onNameChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  email: string | undefined;
  role: string | undefined;
  formError: string | null;
  saved: boolean;
  submitting: boolean;
  onSubmit: (e: FormEvent) => void;
}

export function ProfileForm({
  displayedAvatar,
  processingImage,
  imageError,
  onImageSelect,
  onRemoveAvatar,
  name,
  onNameChange,
  phone,
  onPhoneChange,
  email,
  role,
  formError,
  saved,
  submitting,
  onSubmit,
}: ProfileFormProps) {
  return (
    <div className="mt-6 max-w-md card p-4">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <AvatarField
          displayedAvatar={displayedAvatar}
          processingImage={processingImage}
          imageError={imageError}
          onImageSelect={onImageSelect}
          onRemoveAvatar={onRemoveAvatar}
        />

        <div>
          <label htmlFor="profileName" className="text-xs font-medium text-slate-700">
            {LABEL_NAME}
          </label>
          <input
            id="profileName"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>

        <div>
          <label htmlFor="profilePhone" className="text-xs font-medium text-slate-700">
            {LABEL_PHONE_OPTIONAL}
          </label>
          <input
            id="profilePhone"
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>

        <div>
          <span className="text-xs font-medium text-slate-700">{LABEL_EMAIL}</span>
          <p className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            {email}
          </p>
        </div>

        <div>
          <span className="text-xs font-medium text-slate-700">{LABEL_ROLE}</span>
          <p className="mt-1 capitalize text-sm text-slate-500">{role}</p>
        </div>

        {formError && (
          <p role="alert" className="text-sm text-red-600">
            {formError}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm text-emerald-600">
            {TEXT_PROFILE_UPDATED}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || processingImage}
          className="mt-1 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-brand)] text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? BUTTON_SAVING : BUTTON_SAVE_CHANGES}
        </button>
      </form>
    </div>
  );
}
