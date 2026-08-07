import type { ChangeEvent } from "react";
import {
  BUTTON_PROCESSING,
  BUTTON_CHOOSE_PHOTO,
  BUTTON_REMOVE_PHOTO,
  TEXT_AVATAR_HINT,
  LABEL_FULL_NAME,
  LABEL_DISPLAY_NAME,
  LABEL_EMAIL,
  LABEL_MOBILE,
} from "@/lib";

interface IdentityCardProps {
  displayedAvatar: string | null | undefined;
  processingImage: boolean;
  imageError: string | null;
  onImageSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
  name: string;
  onNameChange: (value: string) => void;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  email: string | undefined;
  phone: string;
  onPhoneChange: (value: string) => void;
}

export function IdentityCard({
  displayedAvatar,
  processingImage,
  imageError,
  onImageSelect,
  onRemoveAvatar,
  name,
  onNameChange,
  displayName,
  onDisplayNameChange,
  email,
  phone,
  onPhoneChange,
}: IdentityCardProps) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("") || "?";

  return (
    <div className="tpl-card" style={{ marginBottom: 11 }}>
      <div className="tpl-row" style={{ gap: 14, marginBottom: 14 }}>
        <span
          className="tpl-mark"
          style={{ width: 52, height: 52, fontSize: 18, overflow: "hidden", flexShrink: 0 }}
        >
          {displayedAvatar ? (
            <img src={displayedAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            initials
          )}
        </span>
        <div>
          <div className="tpl-row" style={{ gap: 7, marginBottom: 5 }}>
            <label htmlFor="settingsAvatarInput" className="tpl-btn" style={{ width: "auto", height: 32, padding: "0 14px", marginBottom: 0, cursor: "pointer" }}>
              {processingImage ? BUTTON_PROCESSING : BUTTON_CHOOSE_PHOTO}
            </label>
            <input
              id="settingsAvatarInput"
              type="file"
              accept="image/*"
              onChange={onImageSelect}
              disabled={processingImage}
              className="sr-only"
            />
            {displayedAvatar && (
              <button type="button" className="tpl-txt" onClick={onRemoveAvatar}>
                {BUTTON_REMOVE_PHOTO}
              </button>
            )}
          </div>
          <p className="tpl-ts">{TEXT_AVATAR_HINT}</p>
        </div>
      </div>
      {imageError && (
        <p role="alert" className="tpl-emsg" style={{ marginBottom: 11 }}>
          <i className="ti ti-alert-circle" aria-hidden />
          {imageError}
        </p>
      )}

      <div className="tpl-g2" style={{ marginBottom: 11 }}>
        <div>
          <label htmlFor="settingsFullName" className="tpl-lbl">
            {LABEL_FULL_NAME}
          </label>
          <div className="tpl-fld">
            <input id="settingsFullName" type="text" value={name} onChange={(e) => onNameChange(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="settingsDisplayName" className="tpl-lbl">
            {LABEL_DISPLAY_NAME}
          </label>
          <div className="tpl-fld">
            <input
              id="settingsDisplayName"
              type="text"
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="tpl-g2">
        <div>
          <label htmlFor="settingsEmail" className="tpl-lbl">
            {LABEL_EMAIL}
          </label>
          <div className="tpl-fld">
            <input id="settingsEmail" type="email" value={email ?? ""} disabled readOnly />
          </div>
        </div>
        <div>
          <label htmlFor="settingsMobile" className="tpl-lbl">
            {LABEL_MOBILE}
          </label>
          <div className="tpl-fld tpl-mono">
            <input id="settingsMobile" type="tel" value={phone} onChange={(e) => onPhoneChange(e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}
