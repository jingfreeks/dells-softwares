import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/PrimaryButton";
import { OnboardingStepHeader } from "./OnboardingStepHeader";
import { colors, radii } from "../../theme/colors";
import { STARTER_CATALOG } from "../../lib/onboarding";
import { PESO } from "../../lib/money";
import { BarcodeScannerModal } from "../../components/BarcodeScannerModal";
import { QuickAddProductModal, type QuickAddForm } from "./QuickAddProductModal";
import type { Product } from "../../lib/types";

interface ProductsStepProps {
  products: Product[];
  enabledCategoryKeys: Set<string>;
  onToggleCategory: (key: string) => void;
  starterItemsToAddCount: number;
  importingStarter: boolean;
  starterError: string | null;
  onImportStarterCatalog: () => void;
  onScannedBarcode: (barcode: string) => void;
  quickAddForm: QuickAddForm;
  onQuickAddFormChange: (form: QuickAddForm) => void;
  quickAddError: string | null;
  savingQuickAdd: boolean;
  onQuickAddSubmit: () => void;
  showQuickAdd: boolean;
  onShowQuickAddChange: (visible: boolean) => void;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
}

const PREVIEW_CHIP_LIMIT = 4;

/** Onboarding step 2 — add products (mobile-onboarding-products.html). */
export function ProductsStep({
  products,
  enabledCategoryKeys,
  onToggleCategory,
  starterItemsToAddCount,
  importingStarter,
  starterError,
  onImportStarterCatalog,
  onScannedBarcode,
  quickAddForm,
  onQuickAddFormChange,
  quickAddError,
  savingQuickAdd,
  onQuickAddSubmit,
  showQuickAdd,
  onShowQuickAddChange,
  onContinue,
  onSkip,
  onBack,
}: ProductsStepProps) {
  const [showScanner, setShowScanner] = useState(false);

  const previewProducts = useMemo(() => products.slice(0, PREVIEW_CHIP_LIMIT), [products]);
  const remainingCount = products.length - previewProducts.length;

  return (
    <View>
      <OnboardingStepHeader step="products" stepNumber={2} totalSteps={4} title="Add products" onBack={onBack} onSkip={onSkip} />
      <Text style={styles.h1}>What do you sell?</Text>
      <Text style={styles.sub}>Pick the fastest way in. Add the rest later.</Text>

      <Card padding={15} style={styles.starterCard}>
        <View style={styles.starterHeaderRow}>
          <View style={styles.sparkleIcon}>
            <Feather name="star" size={16} color={colors.accentSoft} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.starterTitleRow}>
              <Text style={styles.starterTitle}>Starter list</Text>
              <View style={styles.fastestPill}>
                <Text style={styles.fastestPillText}>Fastest</Text>
              </View>
            </View>
            <Text style={styles.starterDesc}>
              120 common sari-sari items with typical prices filled in. Untick what you don&apos;t carry.
            </Text>
          </View>
        </View>

        <View style={styles.chipsRow}>
          {STARTER_CATALOG.map((category) => {
            const enabled = enabledCategoryKeys.has(category.key);
            return (
              <Pressable
                key={category.key}
                accessibilityRole="button"
                accessibilityState={{ selected: enabled }}
                onPress={() => onToggleCategory(category.key)}
                style={[styles.chip, enabled && styles.chipOn]}
              >
                {enabled && <Feather name="check" size={12} color={colors.accentSoft} />}
                <Text style={[styles.chipText, enabled && styles.chipTextOn]}>
                  {category.label} · {category.items.length}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <PrimaryButton
          label={`Add ${starterItemsToAddCount} items`}
          onPress={onImportStarterCatalog}
          loading={importingStarter}
          disabled={starterItemsToAddCount === 0}
        />
        {starterError && (
          <Text accessibilityRole="alert" style={styles.error}>
            {starterError}
          </Text>
        )}
      </Card>

      <View style={styles.methodRow}>
        <Pressable accessibilityRole="button" onPress={() => setShowScanner(true)} style={styles.methodTile}>
          <Feather name="camera" size={18} color={colors.textFaint} />
          <Text style={styles.methodLabel}>Scan the shelf</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => onShowQuickAddChange(true)} style={styles.methodTile}>
          <Feather name="edit-3" size={18} color={colors.textFaint} />
          <Text style={styles.methodLabel}>Type it in</Text>
        </Pressable>
      </View>

      <Card padding={14} style={styles.addedCard}>
        <View style={styles.addedHeaderRow}>
          <Text style={styles.addedHeading}>Added so far</Text>
          <Text style={styles.addedCount}>{products.length} products</Text>
        </View>
        <View style={styles.chipsRow}>
          {previewProducts.map((product) => (
            <View key={product.id} style={styles.plainChip}>
              <Text style={styles.plainChipText}>
                {product.name} · {PESO.format(product.price)}
              </Text>
            </View>
          ))}
          {remainingCount > 0 && (
            <View style={styles.plainChip}>
              <Text style={styles.plainChipText}>+{remainingCount} more</Text>
            </View>
          )}
        </View>
      </Card>

      <PrimaryButton label="Continue" onPress={onContinue} />
      <Pressable accessibilityRole="button" onPress={onSkip} style={styles.skipRow}>
        <Text style={styles.skipText}>Skip for now · saved automatically</Text>
      </Pressable>

      <BarcodeScannerModal
        visible={showScanner}
        onDetected={(code) => {
          setShowScanner(false);
          onScannedBarcode(code);
        }}
        onClose={() => setShowScanner(false)}
      />

      {showQuickAdd && (
        <QuickAddProductModal
          form={quickAddForm}
          onFormChange={onQuickAddFormChange}
          error={quickAddError}
          saving={savingQuickAdd}
          onSubmit={onQuickAddSubmit}
          onClose={() => onShowQuickAddChange(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: "500", color: colors.textStrong, marginBottom: 4 },
  sub: { fontSize: 13, color: colors.textDim, marginBottom: 16 },
  starterCard: {
    marginBottom: 14,
    backgroundColor: "rgba(76, 141, 255, 0.10)",
    borderColor: "rgba(76, 141, 255, 0.42)",
  },
  starterHeaderRow: { flexDirection: "row", gap: 11, alignItems: "flex-start", marginBottom: 12 },
  sparkleIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.panelStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  starterTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  starterTitle: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
  fastestPill: { backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  fastestPillText: { fontSize: 10, fontWeight: "500", color: colors.textPrimary },
  starterDesc: { fontSize: 12.5, lineHeight: 18, color: colors.textDim, marginTop: 3 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 13 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.panelStrong,
  },
  chipOn: { backgroundColor: "rgba(76, 141, 255, 0.18)", borderColor: "rgba(76, 141, 255, 0.35)" },
  chipText: { fontSize: 12, color: colors.textDim },
  chipTextOn: { color: colors.accentSoft, fontWeight: "500" },
  error: { color: colors.error, fontSize: 12, marginTop: 8 },
  methodRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  methodTile: {
    flex: 1,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.card,
    padding: 14,
    alignItems: "center",
  },
  methodLabel: { fontSize: 11.5, color: colors.textDim, marginTop: 7, textAlign: "center" },
  addedCard: { marginBottom: 18 },
  addedHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 11 },
  addedHeading: { fontSize: 13.5, fontWeight: "500", color: colors.textPrimary },
  addedCount: { fontSize: 13, color: colors.success },
  plainChip: { borderRadius: 8, height: 28, paddingHorizontal: 10, justifyContent: "center", backgroundColor: colors.panelStrong },
  plainChipText: { fontSize: 11.5, color: colors.textDim },
  skipRow: { alignItems: "center", marginTop: 12 },
  skipText: { fontSize: 12.5, color: colors.textFaint },
});
