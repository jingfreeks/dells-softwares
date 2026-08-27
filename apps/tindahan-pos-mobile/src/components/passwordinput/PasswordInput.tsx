import { Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { TextField } from "../TextField";
import { usePasswordInput } from "./hooks";
import type { PasswordInputProps } from "./types";

/** TextField variant with a visibility-toggle eye icon (§5 M-002/M-003, `.ti-eye`/`.ti-eye-off`). */
export function PasswordInput({ accessibilityLabel, label, placeholder, value, onChangeText, onFocus, onBlur }: PasswordInputProps) {
  const { visible, toggleVisible } = usePasswordInput();

  return (
    <TextField
      accessibilityLabel={accessibilityLabel}
      label={label}
      placeholder={placeholder}
      secureTextEntry={!visible}
      textContentType="password"
      value={value}
      onChangeText={onChangeText}
      onFocus={onFocus}
      onBlur={onBlur}
      rightElement={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? "Hide password" : "Show password"}
          onPress={toggleVisible}
          hitSlop={8}
        >
          <Feather name={visible ? "eye-off" : "eye"} size={18} color={colors.textMuted} />
        </Pressable>
      }
    />
  );
}
