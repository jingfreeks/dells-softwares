import type { PairedDevice } from "../../types";

export interface DeviceRowProps {
  device: PairedDevice;
  isLast: boolean;
  onUnpair: (device: PairedDevice) => void;
}
