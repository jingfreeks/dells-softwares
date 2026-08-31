import { Text, TextInput, View, type TextStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { useTextField } from "./hooks";
import type { TextFieldProps } from "./types";

/** Reusable text input matching the app's dark-glassy theme, with its own focus-ring state. */
export function TextField({
  accessibilityLabel,
  label,
  error,
  hint,
  success,
  rightElement,
  onFocus,
  onBlur,
  ...props
}: TextFieldProps) {
  const { focused, handleFocus, handleBlur } = useTextField(onFocus, onBlur);
  // A field the user cannot type in has to look different from one they
  // can. Rendered identically, a read-only value reads as an editable
  // one the app is silently refusing.
  const readOnly = props.editable === false;

  const inputRowClasses = [
    "min-h-11 flex-row items-center border rounded-input px-3.5",
    readOnly ? "bg-transparent border-hairline-faint" : "bg-panel-strong",
    focused ? "border-accent" : "border-hairline",
    error ? "border-error bg-[rgba(248,113,113,0.08)]" : "",
    success ? "border-success" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <View className="mb-3">
      {label && <Text className="text-[13px] font-medium text-text-dim mb-1.5">{label}</Text>}
      <View className={inputRowClasses}>
        <TextInput
          accessibilityLabel={accessibilityLabel}
          placeholderTextColor={colors.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`flex-1 py-3 text-base font-normal ${readOnly ? "text-text-dim" : "text-text-primary"}`}
          style={{ outlineStyle: "none" } as unknown as TextStyle}
          {...props}
        />
        {success && !rightElement && <Feather name="check" size={16} color={colors.success} />}
        {rightElement}
      </View>
      {error ? (
        <View className="flex-row items-center gap-[5px] mt-1.5">
          <Feather name="alert-circle" size={12} color={colors.error} />
          <Text className="text-xs text-error">{error}</Text>
        </View>
      ) : hint ? (
        <Text className="text-[11.5px] text-text-faint mt-1.5">{hint}</Text>
      ) : null}
    </View>
  );
}
