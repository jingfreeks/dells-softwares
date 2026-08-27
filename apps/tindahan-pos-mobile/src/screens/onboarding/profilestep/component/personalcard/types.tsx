export interface PersonalCardProps {
  name: string;
  onNameChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  avatarUri: string | null;
  avatarUploading: boolean;
  avatarError: string | null;
  onPickAvatar: () => void;
}
