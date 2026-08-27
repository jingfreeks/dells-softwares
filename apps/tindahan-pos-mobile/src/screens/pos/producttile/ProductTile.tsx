import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../../theme/colors";
import { PESO } from "../../../lib/money";
import { useProductTile } from "./hooks";
import type { ProductTileProps } from "./types";

/** One tile of the 2-column product grid (mobile-cashier-register.html `.ptile`). */
export function ProductTile({ product, quantityInCart, onPress }: ProductTileProps) {
  const { inCart, lowStock } = useProductTile({ product, quantityInCart });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={product.name}
      onPress={onPress}
      className={`basis-[48%] border rounded-card p-3 relative ${
        inCart ? "bg-[rgba(59,130,246,0.10)] border-[rgba(76,141,255,0.42)]" : "bg-panel border-hairline"
      }`}
    >
      {inCart && (
        <View className="absolute top-2 right-2 min-w-[20px] h-5 rounded-full px-[5px] bg-accent items-center justify-center">
          <Text className="text-[11px] font-semibold text-text-primary">{quantityInCart}</Text>
        </View>
      )}
      <View className="w-[34px] h-[34px] rounded-icon-square bg-panel-strong items-center justify-center mb-2">
        <Feather name="package" size={20} color={colors.textFaint} />
      </View>
      <Text className="text-[13px] font-medium text-text-primary mb-[3px]" numberOfLines={1}>
        {product.name}
      </Text>
      <Text className="text-[12.5px] text-text-dim">{PESO.format(product.price)}</Text>
      {lowStock && <Text className="text-[10.5px] text-warning mt-[3px]">{product.stock} left</Text>}
    </Pressable>
  );
}
