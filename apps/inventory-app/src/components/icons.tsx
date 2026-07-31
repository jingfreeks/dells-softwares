import type { SVGProps } from "react";
import type { NavIcon } from "../lib/nav";

type IconProps = SVGProps<SVGSVGElement>;

function Svg(props: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </Svg>
  );
}

export function WarehouseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 21V10l9-6 9 6v11" />
      <path d="M9 21v-6h6v6" />
      <path d="M3 10h18" />
    </Svg>
  );
}

export function ProductIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 7 12 3 4 7l8 4 8-4Z" />
      <path d="M4 7v10l8 4 8-4V7" />
      <path d="M12 11v10" />
    </Svg>
  );
}

export function SupplierIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 21h18" />
      <path d="M6 21V7l6-4 6 4v14" />
      <path d="M10 21v-6h4v6" />
      <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />
    </Svg>
  );
}

export function PurchaseOrderIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </Svg>
  );
}

export function ReceivingIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </Svg>
  );
}

export function TransferIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 7h13l-3-3M3 7l3 3" />
      <path d="M21 17H8l3 3M21 17l-3 3" />
    </Svg>
  );
}

export function ConversionIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 7h10l-3-3M17 17H7l3 3" />
    </Svg>
  );
}

export function BeginningBalanceIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 19V5M4 5l4 4M4 5l-4 4" transform="translate(2 0)" />
      <path d="M9 19h11" />
      <path d="M9 15h7M9 11h5" />
    </Svg>
  );
}

export function ActualInventoryIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
      <path d="m9 15 2 2 4-4" />
    </Svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M6.5 6.7C4 8.3 2 12 2 12s3.5 7 10 7c1.8 0 3.3-.4 4.6-1.1M9.9 5.1C10.6 5 11.3 5 12 5c6.5 0 10 7 10 7-.6 1.1-1.6 2.6-3 3.9" />
    </Svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Svg>
  );
}

export const NAV_ICONS: Record<NavIcon, (props: IconProps) => React.JSX.Element> = {
  dashboard: DashboardIcon,
  warehouses: WarehouseIcon,
  products: ProductIcon,
  suppliers: SupplierIcon,
  purchaseOrders: PurchaseOrderIcon,
  receiving: ReceivingIcon,
  transfers: TransferIcon,
  conversion: ConversionIcon,
  beginningBalance: BeginningBalanceIcon,
  actualInventory: ActualInventoryIcon,
};
