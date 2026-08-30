import { Pressable, Text, View } from "react-native";
import { PrimaryButton } from "../../../components/primarybutton";
import { BarcodeScannerModal } from "../../../components/barcodescannermodal";
import { OnboardingStepHeader } from "../onboardingstepheader";
import { QuickAddProductModal } from "../quickaddproductmodal";
import { AddedSoFarCard, MethodTile, StarterListCard } from "./component";
import { useProductsStep } from "./hooks";
import type { ProductsStepProps } from "./types";

/** Onboarding step 2 — add products (mobile-onboarding-products.html). */
export function ProductsStep(props: ProductsStepProps) {
  const {
    products,
    enabledCategoryKeys,
    onToggleCategory,
    starterItemsToAddCount,
    importingStarter,
    starterError,
    onImportStarterCatalog,
    onScannedBarcode,
    importingCsv,
    csvError,
    onImportCsv,
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
  } = props;

  const { showScanner, setShowScanner, previewProducts, remainingCount } = useProductsStep(products);

  return (
    <View>
      <OnboardingStepHeader step="products" stepNumber={2} totalSteps={4} title="Add products" onBack={onBack} onSkip={onSkip} />
      <Text className="text-xl font-medium text-text-strong mb-1">What do you sell?</Text>
      <Text className="text-[13px] text-text-dim mb-4">Pick the fastest way in. Add the rest later.</Text>

      <StarterListCard
        enabledCategoryKeys={enabledCategoryKeys}
        onToggleCategory={onToggleCategory}
        starterItemsToAddCount={starterItemsToAddCount}
        importingStarter={importingStarter}
        starterError={starterError}
        onImportStarterCatalog={onImportStarterCatalog}
      />

      <View className="flex-row gap-2 mb-3.5">
        <MethodTile icon="camera" label="Scan the shelf" onPress={() => setShowScanner(true)} />
        <MethodTile icon="file-text" label="Import a file" loading={importingCsv} disabled={importingCsv} onPress={onImportCsv} />
        <MethodTile icon="edit-3" label="Type it in" onPress={() => onShowQuickAddChange(true)} />
      </View>
      {csvError && (
        <Text accessibilityRole="alert" className="text-error text-xs -mt-1.5 mb-3.5">
          {csvError}
        </Text>
      )}

      <AddedSoFarCard totalCount={products.length} previewProducts={previewProducts} remainingCount={remainingCount} />

      <PrimaryButton label="Continue" onPress={onContinue} />
      <Pressable accessibilityRole="button" onPress={onSkip} className="items-center mt-3">
        <Text className="text-[12.5px] text-text-faint">Skip for now · saved automatically</Text>
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
