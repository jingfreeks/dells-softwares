import {
  PAGE_HEADING_RECEIPTS,
  TEXT_RECEIPTS_DESCRIPTION,
  LABEL_UNSAVED_CHANGES_CHIP,
  BUTTON_SAVE_CHANGES,
  BUTTON_DISCARD,
  TEXT_RECEIPT_SETTINGS_UPDATED,
  useAuth,
} from "@/lib";
import {
  SettingsLayout,
  HowToSendItCard,
  WhatToIncludeCard,
  FooterMessageCard,
  ReceiptNumberingCard,
  ReceiptPreviewPanel,
} from "./component";
import { useReceiptsSettingsPage } from "./useReceiptsSettingsPage";
import { loadStoreDetailsMock } from "./storeDetailsMock";

export function ReceiptsSettings() {
  const { user } = useAuth();
  const { settings, toggle, setFooterMessage, footerCharactersLeft, nextInvoiceNumberPreview, isDirty, justSaved, onSubmit, onDiscard, store, tin } =
    useReceiptsSettingsPage();

  const storeDetails = user ? loadStoreDetailsMock(user.storeId) : null;

  return (
    <SettingsLayout>
      <form onSubmit={onSubmit} noValidate>
        <div className="tpl-hd">
          <div>
            <p className="tpl-h1" style={{ fontSize: 21 }}>
              {PAGE_HEADING_RECEIPTS}
            </p>
            <p className="tpl-sub">{TEXT_RECEIPTS_DESCRIPTION}</p>
          </div>
          {isDirty && <span className="tpl-chip tpl-w">{LABEL_UNSAVED_CHANGES_CHIP}</span>}
        </div>

        <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_250px]">
          <div>
            <HowToSendItCard
              printOnThermal={settings.printOnThermal}
              onTogglePrintOnThermal={() => toggle("printOnThermal")}
              offerSmsReceipt={settings.offerSmsReceipt}
              onToggleOfferSmsReceipt={() => toggle("offerSmsReceipt")}
              autoPrintEverySale={settings.autoPrintEverySale}
              onToggleAutoPrintEverySale={() => toggle("autoPrintEverySale")}
            />
            <WhatToIncludeCard
              includeLogo={settings.includeLogo}
              onToggleIncludeLogo={() => toggle("includeLogo")}
              includeTinAndPermit={settings.includeTinAndPermit}
              onToggleIncludeTinAndPermit={() => toggle("includeTinAndPermit")}
              includeCashierName={settings.includeCashierName}
              onToggleIncludeCashierName={() => toggle("includeCashierName")}
              includeUtangBalance={settings.includeUtangBalance}
              onToggleIncludeUtangBalance={() => toggle("includeUtangBalance")}
              includeQrToPay={settings.includeQrToPay}
              onToggleIncludeQrToPay={() => toggle("includeQrToPay")}
            />
            <FooterMessageCard
              footerMessage={settings.footerMessage}
              onFooterMessageChange={setFooterMessage}
              charactersLeft={footerCharactersLeft}
            />
            <ReceiptNumberingCard nextReceiptNumber={nextInvoiceNumberPreview} />
          </div>

          <ReceiptPreviewPanel
            storeName={store?.name ?? ""}
            storeAddress={store?.address ?? null}
            city={storeDetails?.city ?? ""}
            contactNumber={storeDetails?.contactNumber ?? ""}
            includeLogo={settings.includeLogo}
            includeTinAndPermit={settings.includeTinAndPermit}
            tin={tin}
            includeCashierName={settings.includeCashierName}
            footerMessage={settings.footerMessage}
            nextReceiptNumber={nextInvoiceNumberPreview}
          />
        </div>

        {justSaved && (
          <p role="status" className="tpl-ok" style={{ margin: "14px 0", fontSize: 13 }}>
            {TEXT_RECEIPT_SETTINGS_UPDATED}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3" style={{ marginTop: 18 }}>
          <button
            type="submit"
            className="tpl-btnp w-full! sm:w-auto!"
            style={{ marginBottom: 0, whiteSpace: "nowrap" }}
            disabled={!isDirty}
          >
            {BUTTON_SAVE_CHANGES}
          </button>
          <button type="button" className="tpl-txt text-center sm:text-left" onClick={onDiscard}>
            {BUTTON_DISCARD}
          </button>
        </div>
      </form>
    </SettingsLayout>
  );
}
