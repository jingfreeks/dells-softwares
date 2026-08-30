import type { CartLine } from "../../../../../lib/types";

export interface CartItemRowProps {
  line: CartLine;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
}
