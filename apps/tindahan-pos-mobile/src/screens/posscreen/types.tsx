export interface PosScreenProps {
  /** Admin-only entry point to the device-pairing settings screen (see App.tsx). */
  onOpenSetupRegister?: () => void;
  /** Admin-only entry point back to the Owner Home dashboard (see App.tsx). */
  onOpenHome?: () => void;
}
