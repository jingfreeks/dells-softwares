import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, radii } from "../../theme/colors";
import { PESO } from "../../lib/money";
import type { Product } from "../../lib/types";

interface ProductTileProps {
  product: Product;
  quantityInCart: number;
  onPress: () => void;
}

/** One tile of the 2-column product grid (mobile-cashier-register.html `.ptile`). */
export function ProductTile({ product, quantityInCart, onPress }: ProductTileProps) {
  const inCart = quantityInCart > 0;
  const lowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={product.name}
      onPress={onPress}
      style={[styles.tile, inCart && styles.tileOn]}
    >
      {inCart && (
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyBadgeText}>{quantityInCart}</Text>
        </View>
      )}
      <View style={styles.iconWrap}>
        <Feather name="package" size={20} color={colors.textFaint} />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {product.name}
      </Text>
      <Text style={styles.price}>{PESO.format(product.price)}</Text>
      {lowStock && <Text style={styles.lowStock}>{product.stock} left</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: "48%",
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.card,
    padding: 12,
    position: "relative",
  },
  tileOn: { backgroundColor: "rgba(59, 130, 246, 0.10)", borderColor: "rgba(76, 141, 255, 0.42)" },
  qtyBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBadgeText: { fontSize: 11, fontWeight: "600", color: colors.textPrimary },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radii.iconSquare,
    backgroundColor: colors.panelStrong,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  name: { fontSize: 13, fontWeight: "500", color: colors.textPrimary, marginBottom: 3 },
  price: { fontSize: 12.5, color: colors.textDim },
  lowStock: { fontSize: 10.5, color: colors.warning, marginTop: 3 },
});
