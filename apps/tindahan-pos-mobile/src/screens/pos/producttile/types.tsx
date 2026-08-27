import type { Product } from "../../../lib/types";

export interface ProductTileProps {
  product: Product;
  quantityInCart: number;
  onPress: () => void;
}
