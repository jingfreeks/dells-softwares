import type { ChangeEvent } from "react";
import { LABEL_PHOTO, BUTTON_PROCESSING, BUTTON_CHOOSE_PHOTO, BUTTON_REMOVE_PHOTO } from "@/lib";
import { ImagePlaceholderIcon } from "@/components";

interface AvatarFieldProps {
  displayedAvatar: string | null | undefined;
  processingImage: boolean;
  imageError: string | null;
  onImageSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
}

export function AvatarField({ displayedAvatar, processingImage, imageError, onImageSelect, onRemoveAvatar }: AvatarFieldProps) {
  return (
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
        <div className="flex flex-col gap-1">
          <label
            htmlFor="avatarInput"
            className="cursor-pointer rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {processingImage ? BUTTON_PROCESSING : BUTTON_CHOOSE_PHOTO}
          </label>
          <input
            id="avatarInput"
            type="file"
            accept="image/*"
            onChange={onImageSelect}
            disabled={processingImage}
            className="sr-only"
          />
          {displayedAvatar && (
            <button
              type="button"
              onClick={onRemoveAvatar}
              className="cursor-pointer text-left text-xs text-red-600 hover:underline"
            >
              {BUTTON_REMOVE_PHOTO}
            </button>
          )}
        </div>
      </div>
      {imageError && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {imageError}
        </p>
      )}
    </div>
  );
}
