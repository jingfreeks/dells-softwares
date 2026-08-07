import type { ChangeEvent } from "react";
import {
  LABEL_TELL_US_ABOUT_YOU_AND_SHOP,
  TEXT_PROFILE_MERGED_DESCRIPTION,
  LABEL_ADD_YOUR_PHOTO,
  TEXT_PHOTO_OPTIONAL_SHOWN_TO_STAFF,
  BUTTON_PROCESSING,
  LABEL_OWNER_NAME,
  LABEL_MOBILE_NUMBER,
  TEXT_MOBILE_NUMBER_HINT,
  LABEL_ADD_STORE_LOGO,
  TEXT_STORE_LOGO_OPTIONAL_PRINTED_ON_RECEIPTS,
  LABEL_STORE_NAME,
  LABEL_STORE_ADDRESS,
  LABEL_SAME_AS_MY_OWN_ADDRESS,
  PLACEHOLDER_ADDRESS,
  LABEL_WHEN_ARE_YOU_USUALLY_OPEN,
  TEXT_OPENING_HOURS_HINT,
  LABEL_TO_SEPARATOR,
  LABEL_OPENING_TIME,
  LABEL_CLOSING_TIME,
  BUTTON_CONTINUE,
  BUTTON_SKIP_FOR_NOW,
  TEXT_SAVED_AUTOMATICALLY,
} from "@/lib";
import { ImagePlaceholderIcon } from "@/components";

interface ProfileStepProps {
  displayedAvatar: string | null;
  avatarError: string | null;
  processingAvatar: boolean;
  onAvatarSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  name: string;
  onNameChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;

  displayedStorePhoto: string | null;
  storePhotoError: string | null;
  processingStorePhoto: boolean;
  onStorePhotoSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  storeName: string;
  onStoreNameChange: (value: string) => void;
  displayedStoreAddress: string;
  onStoreAddressChange: (value: string) => void;
  sameAsProfile: boolean;
  onSameAsProfileChange: (checked: boolean) => void;

  openTime: string;
  onOpenTimeChange: (value: string) => void;
  closeTime: string;
  onCloseTimeChange: (value: string) => void;

  profileError: string | null;
  savingProfile: boolean;
  onContinue: () => void;
  onSkip: () => void;
}

export function ProfileStep({
  displayedAvatar,
  avatarError,
  processingAvatar,
  onAvatarSelect,
  name,
  onNameChange,
  phone,
  onPhoneChange,

  displayedStorePhoto,
  storePhotoError,
  processingStorePhoto,
  onStorePhotoSelect,
  storeName,
  onStoreNameChange,
  displayedStoreAddress,
  onStoreAddressChange,
  sameAsProfile,
  onSameAsProfileChange,

  openTime,
  onOpenTimeChange,
  closeTime,
  onCloseTimeChange,

  profileError,
  savingProfile,
  onContinue,
  onSkip,
}: ProfileStepProps) {
  return (
    <div style={{ padding: "26px 28px" }}>
      <p className="tpl-h1" style={{ marginBottom: 4 }}>
        {LABEL_TELL_US_ABOUT_YOU_AND_SHOP}
      </p>
      <p className="tpl-sub" style={{ marginBottom: 18 }}>
        {TEXT_PROFILE_MERGED_DESCRIPTION}
      </p>

      <div className="tpl-g2" style={{ gap: 18, marginBottom: 14 }}>
        <div className="tpl-card">
          <div className="tpl-row" style={{ gap: 12, marginBottom: 14 }}>
            <span
              className="tpl-av tpl-n"
              style={{ width: 52, height: 52, overflow: "hidden", padding: 0 }}
            >
              {displayedAvatar ? (
                <img src={displayedAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <ImagePlaceholderIcon className="h-5 w-5" />
              )}
            </span>
            <div>
              <label htmlFor="onboardAvatarInput" className="tpl-chip" style={{ cursor: "pointer" }}>
                {processingAvatar ? BUTTON_PROCESSING : LABEL_ADD_YOUR_PHOTO}
              </label>
              <input
                id="onboardAvatarInput"
                type="file"
                accept="image/*"
                onChange={onAvatarSelect}
                disabled={processingAvatar}
                className="sr-only"
              />
              <p className="tpl-ts" style={{ marginTop: 6 }}>
                {TEXT_PHOTO_OPTIONAL_SHOWN_TO_STAFF}
              </p>
            </div>
          </div>
          {avatarError && (
            <p role="alert" className="tpl-emsg" style={{ marginBottom: 10 }}>
              <i className="ti ti-alert-circle" aria-hidden />
              {avatarError}
            </p>
          )}

          <label htmlFor="onboardName" className="tpl-lbl">
            {LABEL_OWNER_NAME}
          </label>
          <div className="tpl-fld" style={{ marginBottom: 14 }}>
            <input id="onboardName" type="text" value={name} onChange={(e) => onNameChange(e.target.value)} />
          </div>

          <label htmlFor="onboardPhone" className="tpl-lbl">
            {LABEL_MOBILE_NUMBER}
          </label>
          <div className="tpl-fld tpl-mono" style={{ marginBottom: 8 }}>
            <input id="onboardPhone" type="tel" value={phone} onChange={(e) => onPhoneChange(e.target.value)} />
          </div>
          <p className="tpl-hint">{TEXT_MOBILE_NUMBER_HINT}</p>
        </div>

        <div className="tpl-card">
          <div className="tpl-row" style={{ gap: 12, marginBottom: 14 }}>
            <span
              className="tpl-av tpl-n"
              style={{ width: 52, height: 52, overflow: "hidden", padding: 0 }}
            >
              {displayedStorePhoto ? (
                <img
                  src={displayedStorePhoto}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <ImagePlaceholderIcon className="h-5 w-5" />
              )}
            </span>
            <div>
              <label htmlFor="onboardStorePhotoInput" className="tpl-chip" style={{ cursor: "pointer" }}>
                {processingStorePhoto ? BUTTON_PROCESSING : LABEL_ADD_STORE_LOGO}
              </label>
              <input
                id="onboardStorePhotoInput"
                type="file"
                accept="image/*"
                onChange={onStorePhotoSelect}
                disabled={processingStorePhoto}
                className="sr-only"
              />
              <p className="tpl-ts" style={{ marginTop: 6 }}>
                {TEXT_STORE_LOGO_OPTIONAL_PRINTED_ON_RECEIPTS}
              </p>
            </div>
          </div>
          {storePhotoError && (
            <p role="alert" className="tpl-emsg" style={{ marginBottom: 10 }}>
              <i className="ti ti-alert-circle" aria-hidden />
              {storePhotoError}
            </p>
          )}

          <label htmlFor="onboardStoreName" className="tpl-lbl">
            {LABEL_STORE_NAME}
          </label>
          <div className="tpl-fld" style={{ marginBottom: 14 }}>
            <input
              id="onboardStoreName"
              type="text"
              value={storeName}
              onChange={(e) => onStoreNameChange(e.target.value)}
            />
          </div>

          <label htmlFor="onboardStoreAddress" className="tpl-lbl">
            {LABEL_STORE_ADDRESS}
          </label>
          <div className="tpl-fld" style={{ marginBottom: 8 }}>
            <input
              id="onboardStoreAddress"
              type="text"
              value={displayedStoreAddress}
              onChange={(e) => onStoreAddressChange(e.target.value)}
              disabled={sameAsProfile}
              placeholder={PLACEHOLDER_ADDRESS}
            />
          </div>
          <label className="tpl-row" style={{ gap: 9, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={sameAsProfile}
              onChange={(e) => onSameAsProfileChange(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <span className="tpl-ts" style={{ fontSize: 12.5 }}>
              {LABEL_SAME_AS_MY_OWN_ADDRESS}
            </span>
          </label>
        </div>
      </div>

      <div className="tpl-card" style={{ marginBottom: 14 }}>
        <div className="tpl-sp">
          <div className="tpl-flex1">
            <p className="tpl-tp" style={{ fontSize: 13.5 }}>
              {LABEL_WHEN_ARE_YOU_USUALLY_OPEN}
            </p>
            <p className="tpl-ts">{TEXT_OPENING_HOURS_HINT}</p>
          </div>
          <div className="tpl-row" style={{ gap: 8 }}>
            <div className="tpl-fld tpl-mono" style={{ height: 34, width: 120 }}>
              <input
                type="time"
                aria-label={LABEL_OPENING_TIME}
                value={openTime}
                onChange={(e) => onOpenTimeChange(e.target.value)}
              />
            </div>
            <span className="tpl-ts">{LABEL_TO_SEPARATOR}</span>
            <div className="tpl-fld tpl-mono" style={{ height: 34, width: 120 }}>
              <input
                type="time"
                aria-label={LABEL_CLOSING_TIME}
                value={closeTime}
                onChange={(e) => onCloseTimeChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {profileError && (
        <p role="alert" className="tpl-emsg" style={{ marginBottom: 14 }}>
          <i className="ti ti-alert-circle" aria-hidden />
          {profileError}
        </p>
      )}

      <div className="tpl-row">
        <button
          type="button"
          className="tpl-btnp"
          style={{ width: "auto", height: 40, marginBottom: 0 }}
          disabled={savingProfile || processingAvatar || processingStorePhoto}
          onClick={onContinue}
        >
          {BUTTON_CONTINUE} <i className="ti ti-arrow-right" aria-hidden />
        </button>
        <button type="button" className="tpl-txt" onClick={onSkip}>
          {BUTTON_SKIP_FOR_NOW}
        </button>
        <p className="tpl-ts" style={{ marginLeft: "auto" }}>
          {TEXT_SAVED_AUTOMATICALLY}
        </p>
      </div>
    </div>
  );
}
