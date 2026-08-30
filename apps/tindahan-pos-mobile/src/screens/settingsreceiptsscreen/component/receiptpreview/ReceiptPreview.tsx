import { Text, View } from "react-native";
import type { ReceiptPreviewProps } from "./types";

/** Thermal-paper colours from the mockup -- deliberately not theme tokens: this is paper, not app chrome. */
const PAPER = "#F5F3EE";
const INK = "#1A1A18";
const INK_SOFT = "#5F5E5A";
const INK_BODY = "#2C2C2A";
const RULE = "#B4B2A9";

const SAMPLE_LINES = [
  { label: "Pancit Canton x3", amount: "54.00" },
  { label: "Skyflakes x2", amount: "18.00" },
  { label: "Globe load 100", amount: "100.00" },
  { label: "Service fee", amount: "5.00" },
];

/**
 * A live preview of what the toggles above would actually print. Sample
 * line items are fixed (this is a preview, not a real sale), but the
 * store's own name/address/contact/TIN come from the real store row, so
 * turning "TIN & permit" on shows this store's actual TIN -- or nothing,
 * honestly, if they haven't set one.
 */
export function ReceiptPreview({
  storeName,
  store,
  includeLogo,
  includeTinAndPermit,
  includeCashierName,
  footerMessage,
}: ReceiptPreviewProps) {
  const addressLine = [store?.address, store?.city].filter(Boolean).join(", ");

  return (
    <View style={{ backgroundColor: PAPER, borderRadius: 8, padding: 13 }}>
      {includeLogo && (
        <Text style={{ color: INK, fontSize: 12.5, textAlign: "center", fontWeight: "500" }}>
          {storeName.toUpperCase()}
        </Text>
      )}
      {!!addressLine && (
        <Text style={{ color: INK_SOFT, fontSize: 9.5, textAlign: "center", lineHeight: 14 }}>{addressLine}</Text>
      )}
      {!!store?.contactNumber && (
        <Text style={{ color: INK_SOFT, fontSize: 9.5, textAlign: "center", lineHeight: 14 }}>
          {store.contactNumber}
        </Text>
      )}
      {includeTinAndPermit && (store?.tin || store?.businessPermitNo) && (
        <Text style={{ color: INK_SOFT, fontSize: 9.5, textAlign: "center", lineHeight: 14 }}>
          {[store?.tin && `TIN ${store.tin}`, store?.businessPermitNo].filter(Boolean).join(" · ")}
        </Text>
      )}

      <Text style={{ marginVertical: 7, color: RULE, fontSize: 9, textAlign: "center" }}>
        - - - - - - - - - - - - - - -
      </Text>

      {SAMPLE_LINES.map((line) => (
        <View key={line.label} className="flex-row justify-between">
          <Text style={{ color: INK_BODY, fontSize: 10.5 }}>{line.label}</Text>
          <Text style={{ color: INK_BODY, fontSize: 10.5 }}>{line.amount}</Text>
        </View>
      ))}

      <Text style={{ marginVertical: 7, color: RULE, fontSize: 9, textAlign: "center" }}>
        - - - - - - - - - - - - - - -
      </Text>

      <View className="flex-row justify-between">
        <Text style={{ color: INK, fontSize: 12, fontWeight: "500" }}>TOTAL</Text>
        <Text style={{ color: INK, fontSize: 12, fontWeight: "500" }}>177.00</Text>
      </View>
      <View className="flex-row justify-between">
        <Text style={{ color: INK_SOFT, fontSize: 10 }}>Cash</Text>
        <Text style={{ color: INK_SOFT, fontSize: 10 }}>200.00</Text>
      </View>
      <View className="flex-row justify-between">
        <Text style={{ color: INK_SOFT, fontSize: 10 }}>Change</Text>
        <Text style={{ color: INK_SOFT, fontSize: 10 }}>23.00</Text>
      </View>

      {includeCashierName && (
        <Text style={{ color: INK_SOFT, fontSize: 9.5, marginTop: 6 }}>Served by: Aling Nena</Text>
      )}

      {!!footerMessage && (
        <>
          <Text style={{ marginVertical: 7, color: RULE, fontSize: 9, textAlign: "center" }}>
            - - - - - - - - - - - - - - -
          </Text>
          <Text style={{ color: INK_SOFT, fontSize: 9.5, textAlign: "center" }}>{footerMessage}</Text>
        </>
      )}
    </View>
  );
}
