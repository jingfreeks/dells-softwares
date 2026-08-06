import type { ChangeEvent } from "react";
import { LABEL_PHOTO, BUTTON_PROCESSING, BUTTON_CHOOSE_PHOTO, BUTTON_REMOVE_PHOTO } from "@/lib";
import { ImagePlaceholderIcon } from "@/components";

interface ProductPhotoFieldProps {
  imagePreview: string | null;
  existingImageUrl: string | null;
  removeImage: boolean;
  imageError: string | null;
  processingImage: boolean;
  onImageSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
}

export function ProductPhotoField({
  imagePreview,
  existingImageUrl,
  removeImage,
  imageError,
  processingImage,
  onImageSelect,
  onRemoveImage,
}: ProductPhotoFieldProps) {
  const hasImage = imagePreview || (existingImageUrl && !removeImage);

  return (
    <div>
      <span className="text-xs font-medium text-slate-700">{LABEL_PHOTO}</span>
      <div className="mt-1 flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {hasImage ? (
            <img src={imagePreview ?? existingImageUrl ?? undefined} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlaceholderIcon className="h-6 w-6 text-slate-300" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="pimage"
            className="cursor-pointer rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {processingImage ? BUTTON_PROCESSING : BUTTON_CHOOSE_PHOTO}
          </label>
          <input
            id="pimage"
            type="file"
            accept="image/*"
            onChange={onImageSelect}
            disabled={processingImage}
            className="sr-only"
          />
          {hasImage && (
            <button
              type="button"
              onClick={onRemoveImage}
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
