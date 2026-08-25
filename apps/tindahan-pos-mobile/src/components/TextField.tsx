import { type ReactNode, useState } from "react";
import { StyleSheet, Text, TextInput, type TextInputProps, type TextStyle, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, minTouchTarget, radii } from "../theme/colors";

interface TextFieldProps extends Omit<TextInputProps, "style" | "placeholderTextColor"> {
  accessibilityLabel: string;
  /** Field label shown above the input (§5 M-002/M-003 labeled fields). Omit for a bare input. */
  label?: string;
  /** Error message + red state (§5 M-002 email field). Takes priority over `success`. */
  error?: string;
  /** Hint text below the input, shown when there's no error (§5 M-003 email field's "We'll send..."). */
  hint?: string;
  /** Green "valid" state with a check mark (§5 M-003 email field). */
  success?: boolean;
  /** Extra element rendered inside the field, right-aligned (e.g. PasswordInput's eye toggle). */
  rightElement?: ReactNode;
}

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
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputRow,
          focused && styles.inputFocused,
          !!error && styles.inputError,
          success && styles.inputSuccess,
        ]}
      >
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
          style={styles.input}
          {...props}
        />
        {success && !rightElement && <Feather name="check" size={16} color={colors.success} />}
        {rightElement}
      </View>
      {error ? (
        <View style={styles.messageRow}>
          <Feather name="alert-circle" size={12} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "500", color: colors.textDim, marginBottom: 6 },
  inputRow: {
    minHeight: minTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    backgroundColor: colors.panelStrong,
  },
  inputFocused: { borderColor: colors.accent },
  inputError: { borderColor: colors.error, backgroundColor: "rgba(248, 113, 113, 0.08)" },
  inputSuccess: { borderColor: colors.success },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "400",
    color: colors.textPrimary,
    // RN Web-only property (not in TextStyle's typings); suppresses the
    // browser's default focus outline so our own focus border color is
    // the only ring. `unknown` bridge needed since this literal has no
    // other overlap with TextStyle from TS's point of view.
    outlineStyle: "none",
  } as unknown as TextStyle,
  messageRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  errorText: { fontSize: 12, color: colors.error },
  hintText: { fontSize: 11.5, color: colors.textFaint, marginTop: 6 },
});
