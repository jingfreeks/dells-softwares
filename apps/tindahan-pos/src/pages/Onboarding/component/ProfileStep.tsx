import type { ChangeEvent } from "react";
import {
  LABEL_TELL_US_ABOUT_YOU,
  TEXT_PROFILE_STEP_DESCRIPTION,
  LABEL_PHOTO,
  BUTTON_PROCESSING,
  BUTTON_CHOOSE_PHOTO,
  LABEL_OWNER_NAME,
  LABEL_PHONE_OPTIONAL,
  LABEL_YOUR_ADDRESS_OPTIONAL,
  PLACEHOLDER_ADDRESS,
  BUTTON_SAVING,
  BUTTON_NEXT_YOUR_STORE,
} from "@/lib";
import { ImagePlaceholderIcon } from "@/components";

export function ProfileStep({
  displayedAvatar,
  avatarError,
  processingAvatar,
  onAvatarSelect,
  name,
  onNameChange,
  phone,
  onPhoneChange,
  address,
  onAddressChange,
  profileError,
  savingProfile,
  onNext,
}: {
  displayedAvatar: string | null;
  avatarError: string | null;
  processingAvatar: boolean;
  onAvatarSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  name: string;
  onNameChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  address: string;
  onAddressChange: (value: string) => void;
  profileError: string | null;
  savingProfile: boolean;
  onNext: () => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">{LABEL_TELL_US_ABOUT_YOU}</h2>
      <p className="mt-1 text-sm text-slate-500">{TEXT_PROFILE_STEP_DESCRIPTION}</p>

      <div className="mt-5 flex flex-col gap-4">
        <div>
          <span className="text-xs font-medium text-slate-700">{LABEL_PHOTO}</span>
          <div className="mt-1 flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
              {displayedAvatar ? (
                <img src={displayedAvatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlaceholderIcon className="h-6 w-6 text-slate-300" />
              )}
            </div>
            <label
              htmlFor="onboardAvatarInput"
              className="cursor-pointer rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {processingAvatar ? BUTTON_PROCESSING : BUTTON_CHOOSE_PHOTO}
            </label>
            <input
              id="onboardAvatarInput"
              type="file"
              accept="image/*"
              onChange={onAvatarSelect}
              disabled={processingAvatar}
              className="sr-only"
            />
          </div>
          {avatarError && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {avatarError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="onboardName" className="text-xs font-medium text-slate-700">
            {LABEL_OWNER_NAME}
          </label>
          <input
            id="onboardName"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>

        <div>
          <label htmlFor="onboardPhone" className="text-xs font-medium text-slate-700">
            {LABEL_PHONE_OPTIONAL}
          </label>
          <input
            id="onboardPhone"
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>

        <div>
          <label htmlFor="onboardAddress" className="text-xs font-medium text-slate-700">
            {LABEL_YOUR_ADDRESS_OPTIONAL}
          </label>
          <input
            id="onboardAddress"
            type="text"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder={PLACEHOLDER_ADDRESS}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
        </div>

        {profileError && (
          <p role="alert" className="text-sm text-red-600">
            {profileError}
          </p>
        )}

        <button
          type="button"
          onClick={onNext}
          disabled={savingProfile || processingAvatar}
          className="mt-1 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-brand)] text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingProfile ? BUTTON_SAVING : BUTTON_NEXT_YOUR_STORE}
        </button>
      </div>
    </div>
  );
}
