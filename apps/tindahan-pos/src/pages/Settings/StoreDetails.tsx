import {
  PAGE_HEADING_STORE_DETAILS,
  TEXT_STORE_DETAILS_DESCRIPTION,
  LABEL_UNSAVED_CHANGES_CHIP,
  BUTTON_SAVE_CHANGES,
  BUTTON_SAVING,
  BUTTON_DISCARD,
  TEXT_STORE_DETAILS_UPDATED,
} from "@/lib";
import { SettingsLayout, StoreIdentityCard, OpeningHoursCard, BirRegistrationCard } from "./component";
import { useStoreDetailsPage } from "./useStoreDetailsPage";

export function StoreDetails() {
  const {
    storeName,
    setStoreName,
    address,
    setAddress,
    displayedPhoto,
    photoError,
    processingPhoto,
    onPhotoSelect,

    contactNumber,
    setContactNumber,
    city,
    setCity,
    tin,
    setTin,
    businessPermitNo,
    setBusinessPermitNo,
    birRegistered,
    setBirRegistered,
    vatStatus,
    setVatStatus,
    vatRate,
    setVatRate,
    invoiceType,
    setInvoiceType,

    openTime,
    setOpenTime,
    closeTime,
    setCloseTime,

    formError,
    saved,
    submitting,
    isDirty,
    onSubmit,
    onDiscard,
  } = useStoreDetailsPage();

  return (
    <SettingsLayout>
      <form onSubmit={onSubmit} noValidate>
        <div className="tpl-hd">
          <div>
            <p className="tpl-h1" style={{ fontSize: 21 }}>
              {PAGE_HEADING_STORE_DETAILS}
            </p>
            <p className="tpl-sub">{TEXT_STORE_DETAILS_DESCRIPTION}</p>
          </div>
          {isDirty && <span className="tpl-chip tpl-w">{LABEL_UNSAVED_CHANGES_CHIP}</span>}
        </div>

        <StoreIdentityCard
          displayedPhoto={displayedPhoto}
          processingPhoto={processingPhoto}
          photoError={photoError}
          onPhotoSelect={onPhotoSelect}
          storeName={storeName}
          onStoreNameChange={setStoreName}
          contactNumber={contactNumber}
          onContactNumberChange={setContactNumber}
          address={address}
          onAddressChange={setAddress}
          city={city}
          onCityChange={setCity}
        />

        <OpeningHoursCard
          openTime={openTime}
          onOpenTimeChange={setOpenTime}
          closeTime={closeTime}
          onCloseTimeChange={setCloseTime}
        />

        <BirRegistrationCard
          birRegistered={birRegistered}
          onToggleBirRegistered={() => setBirRegistered(!birRegistered)}
          tin={tin}
          onTinChange={setTin}
          businessPermitNo={businessPermitNo}
          onBusinessPermitNoChange={setBusinessPermitNo}
          vatStatus={vatStatus}
          onVatStatusChange={setVatStatus}
          vatRate={vatRate}
          onVatRateChange={setVatRate}
          invoiceType={invoiceType}
          onInvoiceTypeChange={setInvoiceType}
        />

        {formError && (
          <p role="alert" className="tpl-emsg" style={{ marginBottom: 14 }}>
            <i className="ti ti-alert-circle" aria-hidden />
            {formError}
          </p>
        )}
        {saved && (
          <p role="status" className="tpl-ok" style={{ marginBottom: 14, fontSize: 13 }}>
            {TEXT_STORE_DETAILS_UPDATED}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <button
            type="submit"
            className="tpl-btnp w-full! sm:w-auto!"
            style={{ marginBottom: 0, whiteSpace: "nowrap" }}
            disabled={submitting || processingPhoto}
          >
            {submitting ? BUTTON_SAVING : BUTTON_SAVE_CHANGES}
          </button>
          <button type="button" className="tpl-txt text-center sm:text-left" onClick={onDiscard}>
            {BUTTON_DISCARD}
          </button>
        </div>
      </form>
    </SettingsLayout>
  );
}
