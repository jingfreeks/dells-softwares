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
    <div style={{ marginBottom: 14 }}>
      <span className="tpl-lbl">{LABEL_PHOTO}</span>
      <div className="tpl-sp" style={{ justifyContent: "flex-start", gap: 12, marginTop: 6 }}>
        <div
          style={{
            width: 64,
            height: 64,
            flexShrink: 0,
            borderRadius: 12,
            border: "1px solid var(--tpl-bd)",
            background: "var(--tpl-gl3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            color: "var(--tpl-t7)",
          }}
        >
          {hasImage ? (
            <img
              src={imagePreview ?? existingImageUrl ?? undefined}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <ImagePlaceholderIcon className="h-6 w-6" />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label
            htmlFor="pimage"
            className="tpl-btn"
            style={{ cursor: "pointer", marginBottom: 0, width: "auto", height: 34, padding: "0 12px", fontSize: 12 }}
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
              className="tpl-lnk"
              style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", color: "var(--tpl-bad)" }}
            >
              {BUTTON_REMOVE_PHOTO}
            </button>
          )}
        </div>
      </div>
      {imageError && (
        <p role="alert" className="tpl-emsg">
          <i className="ti ti-alert-circle" aria-hidden />
          {imageError}
        </p>
      )}
    </div>
  );
}
