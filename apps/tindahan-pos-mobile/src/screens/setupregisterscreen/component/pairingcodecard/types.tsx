export interface PairingCodeCardProps {
  code: string | null;
  msLeft: number;
  generating: boolean;
  generateError: string | null;
  onGenerate: () => void;
}
