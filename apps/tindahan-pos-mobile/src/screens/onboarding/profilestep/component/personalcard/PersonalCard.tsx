import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../../../../components/card";
import { TextField } from "../../../../../components/textfield";
import { colors } from "../../../../../theme/colors";
import type { PersonalCardProps } from "./types";

export function PersonalCard({
  name,
  onNameChange,
  phone,
  onPhoneChange,
  avatarUri,
  avatarUploading,
  avatarError,
  onPickAvatar,
}: PersonalCardProps) {
  return (
    <Card padding={15} style={{ marginBottom: 12 }}>
      <View className="flex-row items-center gap-3 mb-3.5">
        <Pressable
          accessibilityRole="button"
          onPress={onPickAvatar}
          disabled={avatarUploading}
          className="w-12 h-12 rounded-full bg-panel-strong border border-hairline items-center justify-center overflow-hidden"
        >
          {avatarUploading ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : avatarUri ? (
            <Image source={{ uri: avatarUri }} className="w-full h-full" />
          ) : (
            <Feather name="user" size={20} color={colors.textFaint} />
          )}
        </Pressable>
        <View className="flex-1">
          <Pressable
            accessibilityRole="button"
            onPress={onPickAvatar}
            disabled={avatarUploading}
            className="self-start h-[34px] px-3 rounded-control border border-hairline bg-panel-strong items-center justify-center"
          >
            <Text className="text-[12.5px] text-text-dim font-medium">Add your photo</Text>
          </Pressable>
          <Text className="text-xs text-text-faint mt-1.5">Optional · shown to staff</Text>
        </View>
      </View>
      {avatarError && (
        <Text accessibilityRole="alert" className="text-error text-xs mb-2.5">
          {avatarError}
        </Text>
      )}
      <TextField accessibilityLabel="Your name" label="Your name" value={name} onChangeText={onNameChange} />
      <TextField
        accessibilityLabel="Mobile number"
        label="Mobile number"
        value={phone}
        onChangeText={onPhoneChange}
        keyboardType="phone-pad"
      />
    </Card>
  );
}
