import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../components/card";
import { DetailHeader } from "../../components/detailheader";
import { ScreenContainer } from "../../components/screencontainer";
import { SmallButton } from "../../components/smallbutton";
import { colors } from "../../theme/colors";
import { ExportRow } from "./component/exportrow";
import { useSettingsBackupScreen } from "./hooks";
import type { SettingsBackupScreenProps } from "./types";

/** mobile-settings-backup.html -- your sales history, kept safe. */
export function SettingsBackupScreen({ onBack }: SettingsBackupScreenProps) {
  const s = useSettingsBackupScreen();
  const nothingToExport = s.salesCount === 0 && s.productsCount === 0 && s.customersCount === 0;

  return (
    <ScreenContainer>
      <DetailHeader title="Backup" subtitle="Your sales history is the store's memory" onBack={onBack} />

      <Card padding={14} style={{ marginBottom: 14 }}>
        <View className="flex-row items-start">
          <Feather name="check-circle" size={17} color={colors.success} style={{ marginTop: 2 }} />
          <View className="flex-1 ml-3">
            <Text className="text-[13.5px] font-medium text-text-primary">Always up to date</Text>
            <Text className="text-[12px] text-text-dim leading-[17px] mt-0.5">
              Every sale, product, and customer saves straight to the cloud as you go.
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-3">
          <Text className="text-[12.5px] text-text-dim">
            {s.salesCount} sales · {s.productsCount} products · {s.customersCount} customers
          </Text>
          <SmallButton
            label={s.refreshing ? "Refreshing…" : "Refresh now"}
            onPress={s.onRefreshNow}
            disabled={s.refreshing}
          />
        </View>
      </Card>

      {/* Real, scheduled backups run outside both apps (a GitHub Actions
          workflow). Nothing here is configurable, and no live "last backup"
          status is shown: a dump contains every store's data, so there is no
          tenant-scoped client read of it that would be safe. Same static
          note the web app carries, for the same reason. */}
      <Card padding={14} style={{ marginBottom: 14 }}>
        <Text className="text-[13.5px] font-medium text-text-primary mb-1.5">Automatic backup</Text>
        <Text className="text-[12px] text-text-dim leading-[17px]">
          Backups run automatically every day and are stored securely, separate from what any store can
          access. There's nothing to configure here.
        </Text>
      </Card>

      <Card padding={14} style={{ marginBottom: 14 }}>
        <Text className="text-[13.5px] font-medium text-text-primary mb-2.5">Take a copy for yourself</Text>
        <ExportRow
          icon="file-text"
          label="Sales as CSV"
          description="Opens in Excel"
          busy={s.exporting === "sales"}
          disabled={s.exporting !== null || s.salesCount === 0}
          onPress={s.onExportSales}
        />
        <ExportRow
          icon="box"
          label="Product list"
          description="With prices and stock"
          busy={s.exporting === "products"}
          disabled={s.exporting !== null || s.productsCount === 0}
          onPress={s.onExportProducts}
        />
        <ExportRow
          icon="archive"
          label="Everything"
          description="Full backup file"
          busy={s.exporting === "everything"}
          disabled={s.exporting !== null || nothingToExport}
          onPress={s.onExportEverything}
        />
        <Text className="text-[11.5px] text-text-faint mt-1">
          Your phone asks where to send the file — Files, email, or anywhere else.
        </Text>
      </Card>

      {s.error && (
        <Text accessibilityRole="alert" className="text-error text-[12.5px] mb-3">
          {s.error}
        </Text>
      )}

      <Card padding={14} style={{ marginBottom: 24 }}>
        <Text className="text-[13.5px] font-medium text-text-dim mb-1.5">Restore from a backup</Text>
        <Text className="text-[12px] text-text-faint leading-[17px]">
          Not available yet — this would replace everything currently in the app.
        </Text>
      </Card>
    </ScreenContainer>
  );
}
