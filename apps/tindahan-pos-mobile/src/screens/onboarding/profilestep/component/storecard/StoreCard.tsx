import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { Card } from "../../../../../components/Card";
import { Checkbox } from "../../../../../components/Checkbox";
import { TextField } from "../../../../../components/TextField";
import { colors } from "../../../../../theme/colors";
import type { StoreCardProps } from "./types";

export function StoreCard({
  storeName,
  onStoreNameChange,
  storeAddress,
  onStoreAddressChange,
  sameAsProfile,
  onSameAsProfileChange,
  address,
  onAddressChange,
  storePhotoUri,
  storePhotoUploading,
  storePhotoError,
  onPickStorePhoto,
}: StoreCardProps) {
  return (
    <Card padding={15} style={{ marginBottom: 12 }}>
      <View className="flex-row items-center gap-3 mb-3.5">
        <Pressable
          accessibilityRole="button"
          onPress={onPickStorePhoto}
          disabled={storePhotoUploading}
          className="w-12 h-12 rounded-icon-square bg-accent items-center justify-center overflow-hidden"
        >
          {storePhotoUploading ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : storePhotoUri ? (
            <Image source={{ uri: storePhotoUri }} className="w-full h-full" />
          ) : (
            <Text className="text-lg font-semibold text-text-primary">{(storeName || "D")[0].toUpperCase()}</Text>
          )}
        </Pressable>
        <View className="flex-1">
          <Pressable
            accessibilityRole="button"
            onPress={onPickStorePhoto}
            disabled={storePhotoUploading}
            className="self-start h-[34px] px-3 rounded-control border border-hairline bg-panel-strong items-center justify-center"
          >
            <Text className="text-[12.5px] text-text-dim font-medium">Add store logo</Text>
          </Pressable>
          <Text className="text-xs text-text-faint mt-1.5">Optional · printed on receipts</Text>
        </View>
      </View>
      {storePhotoError && (
        <Text accessibilityRole="alert" className="text-error text-xs mb-2.5">
          {storePhotoError}
        </Text>
      )}
      <TextField accessibilityLabel="Store name" label="Store name" value={storeName} onChangeText={onStoreNameChange} />
      <Checkbox checked={sameAsProfile} onToggle={() => onSameAsProfileChange(!sameAsProfile)} label="Address same as mine" />
      <View className="mt-1">
        {sameAsProfile ? (
          <TextField accessibilityLabel="Your address" label="Address" value={address} onChangeText={onAddressChange} />
        ) : (
          <TextField
            accessibilityLabel="Store address"
            label="Store address"
            value={storeAddress}
            onChangeText={onStoreAddressChange}
          />
        )}
      </View>
    </Card>
  );
}
