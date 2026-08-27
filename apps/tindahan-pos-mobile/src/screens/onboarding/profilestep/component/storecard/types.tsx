export interface StoreCardProps {
  storeName: string;
  onStoreNameChange: (value: string) => void;
  storeAddress: string;
  onStoreAddressChange: (value: string) => void;
  sameAsProfile: boolean;
  onSameAsProfileChange: (value: boolean) => void;
  address: string;
  onAddressChange: (value: string) => void;
  storePhotoUri: string | null;
  storePhotoUploading: boolean;
  storePhotoError: string | null;
  onPickStorePhoto: () => void;
}
