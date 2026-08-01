import type { SupabaseClient } from "@supabase/supabase-js";

// A file's extension and browser-reported MIME type are both just labels the
// uploader chose — neither proves the bytes are actually an image. Real
// validation needs two independent checks: the magic-byte signature (catches
// an outright non-image file) and a successful decode (catches a corrupted
// or polyglot file that merely starts with the right bytes). Re-encoding the
// decoded pixels through a canvas afterward is what actually neutralizes any
// non-pixel payload a crafted file might carry — that step, not the checks
// above, is the real security boundary.
const MAGIC_SIGNATURES: { mime: string; bytes: number[] }[] = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
];

const MAX_RAW_FILE_BYTES = 8 * 1024 * 1024;

function readFileHeader(file: File, byteCount: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file."));
    reader.readAsArrayBuffer(file.slice(0, byteCount));
  });
}

function matchesKnownImageSignature(bytes: Uint8Array): boolean {
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true; // WEBP: "RIFF"...."WEBP"
  }
  return MAGIC_SIGNATURES.some(({ bytes: sig }) => sig.every((b, i) => bytes[i] === b));
}

export interface ImageUploadOptions {
  /** Longest edge, in pixels, after resizing. */
  maxDimension: number;
  /** 0–1 WebP encode quality. */
  quality?: number;
}

/**
 * Validates that `file` is a real, decodable image and returns a resized,
 * re-encoded WebP blob ready to upload. Throws a friendly Error otherwise.
 */
export async function validateAndOptimizeImage(
  file: File,
  { maxDimension, quality = 0.82 }: ImageUploadOptions
): Promise<Blob> {
  if (file.size > MAX_RAW_FILE_BYTES) {
    throw new Error("That image is too large (max 8MB).");
  }

  const header = await readFileHeader(file, 16);
  if (!matchesKnownImageSignature(header)) {
    throw new Error("That file doesn't look like a valid image.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That file couldn't be read as an image.");
  }

  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process the image.");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality)
    );
    if (!blob) throw new Error("Could not process the image.");
    return blob;
  } finally {
    bitmap.close();
  }
}

/** Uploads `blob` to `bucket`/`path` (overwriting any existing object) and returns its public URL. */
export async function uploadImage(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  blob: Blob
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { upsert: true, contentType: blob.type });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
