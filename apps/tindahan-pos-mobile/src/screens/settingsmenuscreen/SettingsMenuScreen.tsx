import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Avatar } from "../../components/avatar";
import { Card } from "../../components/card";
import { DetailHeader } from "../../components/detailheader";
import { ListRow } from "../../components/listrow";
import { ScreenContainer } from "../../components/screencontainer";
import { colors } from "../../theme/colors";
import { useSettingsMenuScreen } from "./hooks";
import type { SettingsMenuScreenProps } from "./types";

/** Settings hub reached from the More tab (mobile-settings-menu.html) -- one list instead of the desktop sidebar. */
export function SettingsMenuScreen({ onBack, onOpenSection }: SettingsMenuScreenProps) {
  const { items, storeName, userName, userEmail, userInitials } = useSettingsMenuScreen();

  return (
    <ScreenContainer>
      <DetailHeader title="Settings" subtitle={storeName} onBack={onBack} />

      <Card padding={14} style={{ marginBottom: 16 }}>
        <View className="flex-row items-center gap-3">
          <Avatar initial={userInitials} size={46} />
          <View className="flex-1">
            <Text className="text-[14px] font-medium text-text-primary" numberOfLines={1}>
              {userName}
            </Text>
            <Text className="text-[11.5px] text-text-faint" numberOfLines={1}>
              {userEmail}
            </Text>
          </View>
        </View>
      </Card>

      <Card padding={14}>
        {items.map((item, i) => (
          <View key={item.key}>
            <ListRow
              icon={item.icon}
              title={item.title}
              subtitle={item.description}
              onPress={() => onOpenSection(item.key)}
              trailing={<Feather name="chevron-right" size={16} color={colors.textFaint} />}
            />
            {i < items.length - 1 && <View className="h-px bg-hairline" />}
          </View>
        ))}
      </Card>
    </ScreenContainer>
  );
}
