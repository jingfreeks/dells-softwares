import { Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabaseClient";

/**
 * Mirrors the web app's imageUpload.ts (apps/tindahan-pos/src/lib/imageUpload/imageUpload.ts):
 * pick -> validate -> resize/recompress -> upload to Supabase Storage,
 * same buckets ("avatars", "store-photos"), same 2MB bucket-side limit,
 * same `${storeId}/${staffId}/avatar...` / `${storeId}/store-photo...`
 * path shape that the storage RLS policies key off of. Re-encodes to JPEG
 * rather than WebP (web's choice) -- both are in the bucket's
 * `allowed_mime_types`, and JPEG output is what expo-image-manipulator
 * supports without a version-support question mark.
 *
 * No magic-byte signature check here (web's real security boundary
 * against a spoofed/polyglot file uploaded through a raw <input
 * type=file>): expo-image-picker's own OS media picker only ever hands
 * back a real image asset, so that attack surface doesn't exist on this
 * path the way it does for a browser file input.
 */
const MAX_RAW_FILE_BYTES = 8 * 1024 * 1024;
const JPEG_CONTENT_TYPE = "image/jpeg";

export interface OptimizedImage {
  /** Local file:// URI of the resized/recompressed image, for an immediate preview. */
  uri: string;
  base64: string;
  contentType: string;
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

/**
 * Opens the OS photo picker and returns a resized/recompressed image ready
 * to upload, or null if the user cancelled. `maxDimension` caps the
 * longest edge (matching web's own resize-to-fit behavior) -- an image
 * already smaller is never upscaled, only recompressed.
 */
export async function pickAndOptimizeImage(maxDimension: number, quality = 0.82): Promise<OptimizedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo library permission is required to add a photo.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1,
    allowsEditing: false,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];

  const info = await FileSystem.getInfoAsync(asset.uri);
  if (info.exists && info.size !== undefined && info.size > MAX_RAW_FILE_BYTES) {
    throw new Error("That image is too large (max 8MB).");
  }

  const { width, height } = await getImageSize(asset.uri);
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const actions =
    scale < 1
      ? [{ resize: { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) } }]
      : [];

  const manipulated = await ImageManipulator.manipulateAsync(asset.uri, actions, {
    compress: quality,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  if (!manipulated.base64) {
    throw new Error("Could not process the image.");
  }

  return { uri: manipulated.uri, base64: manipulated.base64, contentType: JPEG_CONTENT_TYPE };
}

/** Uploads `image` to `bucket`/`path` (overwriting any existing object) and returns its public URL. */
export async function uploadImage(bucket: string, path: string, image: OptimizedImage): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, decode(image.base64), { upsert: true, contentType: image.contentType });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
