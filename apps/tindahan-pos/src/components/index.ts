export * from "./icons";
// BarcodeScanner is intentionally excluded — it's dynamically import()'d
// (see Pos.tsx, Inventory.tsx, Receiving.tsx) to keep html5-qrcode out of
// the main bundle. Re-exporting it here would make every "@/components"
// consumer statically pull it in, undoing the code-split. Import it
// directly from "@/components/BarcodeScanner" instead.
export * from "./BottomNav";
export * from "./CardActionIcons";
export * from "./CategoryManager";
export * from "./MobileHeader";
export * from "./OnboardingRoute";
export * from "./ProtectedRoute";
export * from "./ScannerLoadingOverlay";
export * from "./SectionCardHeader";
export * from "./Sidebar";
export * from "./StatCard";
export * from "./StockBadge";
export * from "./Topbar";
