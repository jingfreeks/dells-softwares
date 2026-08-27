export interface SetupRegisterScreenProps {
  onBack: () => void;
}

export interface PairedDevice {
  id: string;
  name: string;
  pairedAt: string;
  lastSeenAt: string | null;
}
