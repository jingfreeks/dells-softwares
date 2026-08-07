import type { ChangeEvent } from "react";
import {
  BUTTON_PROCESSING,
  BUTTON_CHANGE_LOGO,
  TEXT_LOGO_HINT,
  LABEL_STORE_NAME,
  LABEL_CONTACT_NUMBER,
  LABEL_ADDRESS,
  PLACEHOLDER_ADDRESS,
  LABEL_CITY,
  LABEL_CURRENCY,
  LABEL_TIME_ZONE,
} from "@/lib";

interface StoreIdentityCardProps {
  displayedPhoto: string | null;
  processingPhoto: boolean;
  photoError: string | null;
  onPhotoSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  storeName: string;
  onStoreNameChange: (value: string) => void;
  contactNumber: string;
  onContactNumberChange: (value: string) => void;
  address: string;
  onAddressChange: (value: string) => void;
  city: string;
  onCityChange: (value: string) => void;
}

export function StoreIdentityCard({
  displayedPhoto,
  processingPhoto,
  photoError,
  onPhotoSelect,
  storeName,
  onStoreNameChange,
  contactNumber,
  onContactNumberChange,
  address,
  onAddressChange,
  city,
  onCityChange,
}: StoreIdentityCardProps) {
  return (
    <div className="tpl-card" style={{ marginBottom: 11 }}>
      <div className="tpl-row" style={{ gap: 14, marginBottom: 14 }}>
        <span className="tpl-mark" style={{ width: 52, height: 52, fontSize: 18, overflow: "hidden", flexShrink: 0 }}>
          {displayedPhoto ? (
            <img src={displayedPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            storeName.charAt(0).toUpperCase() || "?"
          )}
        </span>
        <div>
          <label htmlFor="storeLogoInput" className="tpl-btn" style={{ width: "auto", height: 32, padding: "0 14px", marginBottom: 0, cursor: "pointer" }}>
            {processingPhoto ? BUTTON_PROCESSING : BUTTON_CHANGE_LOGO}
          </label>
          <input
            id="storeLogoInput"
            type="file"
            accept="image/*"
            onChange={onPhotoSelect}
            disabled={processingPhoto}
            className="sr-only"
          />
          <p className="tpl-ts" style={{ marginTop: 6 }}>
            {TEXT_LOGO_HINT}
          </p>
        </div>
      </div>
      {photoError && (
        <p role="alert" className="tpl-emsg" style={{ marginBottom: 11 }}>
          <i className="ti ti-alert-circle" aria-hidden />
          {photoError}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]" style={{ marginBottom: 11 }}>
        <div>
          <label htmlFor="storeDetailsName" className="tpl-lbl">
            {LABEL_STORE_NAME}
          </label>
          <div className="tpl-fld">
            <input
              id="storeDetailsName"
              type="text"
              value={storeName}
              onChange={(e) => onStoreNameChange(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label htmlFor="storeContactNumber" className="tpl-lbl">
            {LABEL_CONTACT_NUMBER}
          </label>
          <div className="tpl-fld tpl-mono">
            <input
              id="storeContactNumber"
              type="tel"
              value={contactNumber}
              onChange={(e) => onContactNumberChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      <label htmlFor="storeDetailsAddress" className="tpl-lbl">
        {LABEL_ADDRESS}
      </label>
      <div className="tpl-fld" style={{ marginBottom: 11 }}>
        <input
          id="storeDetailsAddress"
          type="text"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder={PLACEHOLDER_ADDRESS}
        />
      </div>

      <div className="tpl-g3">
        <div>
          <label htmlFor="storeCity" className="tpl-lbl">
            {LABEL_CITY}
          </label>
          <div className="tpl-fld">
            <input id="storeCity" type="text" value={city} onChange={(e) => onCityChange(e.target.value)} />
          </div>
        </div>
        <div>
          <span className="tpl-lbl">{LABEL_CURRENCY}</span>
          <div className="tpl-fld" style={{ color: "var(--tpl-t5)" }}>
            ₱ PHP
          </div>
        </div>
        <div>
          <span className="tpl-lbl">{LABEL_TIME_ZONE}</span>
          <div className="tpl-fld" style={{ color: "var(--tpl-t5)" }}>
            GMT+8
          </div>
        </div>
      </div>
    </div>
  );
}
