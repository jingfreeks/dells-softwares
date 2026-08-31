import type { Store } from "../../../../lib/types";

export interface ReceiptPreviewProps {
  storeName: string;
  /** Address/contact/TIN lines come from the real store row, so the preview shows what would actually print. */
  store: Store | null;
  includeLogo: boolean;
  includeTinAndPermit: boolean;
  includeCashierName: boolean;
  footerMessage: string;
}
