import { useState } from "react";
import { StyleSheet, TextInput, type TextInputProps, type TextStyle } from "react-native";
import { colors, minTouchTarget, radii } from "../theme/colors";

interface TextFieldProps extends Omit<TextInputProps, "style" | "placeholderTextColor"> {
  accessibilityLabel: string;
}

/** Reusable text input matching the app's dark-glassy theme, with its own focus-ring state. */
export function TextField({ accessibilityLabel, onFocus, onBlur, ...props }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      accessibilityLabel={accessibilityLabel}
      placeholderTextColor={colors.textMuted}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[styles.input, focused && styles.inputFocused]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: minTouchTarget,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.control,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "400",
    color: colors.textPrimary,
    backgroundColor: colors.panelStrong,
    marginBottom: 12,
    // RN Web-only property (not in TextStyle's typings); suppresses the
    // browser's default focus outline so our own focus border color is
    // the only ring. Cast the whole literal rather than `@ts-expect-error`
    // on this one line, since the type error can otherwise surface at the
    // JSX usage site instead of here, depending on inference order.
    outlineStyle: "none",
  } as unknown as TextStyle,
  inputFocused: { borderColor: colors.accent },
});
