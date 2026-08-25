import { useState } from "react";
import { Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { TextField } from "./TextField";

interface PasswordInputProps {
  accessibilityLabel: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/** TextField variant with a visibility-toggle eye icon (§5 M-002/M-003, `.ti-eye`/`.ti-eye-off`). */
export function PasswordInput({ accessibilityLabel, label, placeholder, value, onChangeText, onFocus, onBlur }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

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
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
        >
          <Feather name={visible ? "eye-off" : "eye"} size={18} color={colors.textMuted} />
        </Pressable>
      }
    />
  );
}
