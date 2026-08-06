import type { Supplier } from "@/lib";

export interface SupplierDetailCardProps {
  supplier: Supplier;
  qrDataUrl: string | null;
  onEdit: (supplier: Supplier) => void;
  onPrint: () => void;
}