export interface HoursCardProps {
  openTime: string;
  onOpenTimeChange: (value: string) => void;
  closeTime: string;
  onCloseTimeChange: (value: string) => void;
}
