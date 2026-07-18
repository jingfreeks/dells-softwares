type IconProps = { className?: string };

export function PosIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M3 3h2l.4 2M7 13h10l3-8H5.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
    </svg>
  );
}

export function InventoryIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M3 7l9-4 9 4-9 4-9-4Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 7v10l9 4 9-4V7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 11v10" strokeLinecap="round" />
    </svg>
  );
}

export function AdminIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StaffIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.4 2.5-5.8 5.5-5.8s5.5 2.4 5.5 5.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 8.5a2.8 2.8 0 1 0 0-5.6M18 14.5c2.2.4 3.5 2.3 3.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CameraIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path
        d="M4 8h2.5l1.3-2h8.4l1.3 2H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13.5" r="3.2" />
    </svg>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M6.5 6.7C4 8.3 2 12 2 12s3.5 7 10 7c1.8 0 3.3-.4 4.6-1.1M9.9 5.1C10.6 5 11.3 5 12 5c6.5 0 10 7 10 7-.6 1.1-1.6 2.6-3 3.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TruckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M2 7h11v9H2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 10h4l4 3v3h-8z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.5" cy="18" r="1.7" />
      <circle cx="17" cy="18" r="1.7" />
    </svg>
  );
}

export const NAV_ICONS = {
  pos: PosIcon,
  inventory: InventoryIcon,
  admin: AdminIcon,
  staff: StaffIcon,
};
