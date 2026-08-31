import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";

/**
 * Opens the OS file picker and returns the picked file's text content, or
 * null if the user cancelled. Broad MIME allowlist since CSV files get
 * reported inconsistently across platforms (some report "text/csv", some
 * "text/comma-separated-values", some fall back to "text/plain") --
 * `parseProductsCsv` is the real validation, this is just the picker filter.
 */
export async function pickCsvFileText(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["text/csv", "text/comma-separated-values", "text/plain", "public.comma-separated-values-text"],
    copyToCacheDirectory: true,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return new File(result.assets[0].uri).text();
}
