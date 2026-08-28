import type { PairedDevice } from "../../types";

export interface UnpairModalProps {
  device: PairedDevice;
  onClose: () => void;
  onUnpaired: () => void;
}
