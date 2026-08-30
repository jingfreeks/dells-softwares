export interface StarterListCardProps {
  enabledCategoryKeys: Set<string>;
  onToggleCategory: (key: string) => void;
  starterItemsToAddCount: number;
  importingStarter: boolean;
  starterError: string | null;
  onImportStarterCatalog: () => void;
}
