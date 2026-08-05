import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadImage, validateAndOptimizeImage } from "../imageUpload";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function makeFile(bytes: number[], name = "photo.png", type = "image/png"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

function stubCanvas(blob: Blob | null) {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb) => cb(blob));
}

function stubDecodableBitmap(width = 800, height = 600) {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width, height, close: vi.fn() })
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("validateAndOptimizeImage", () => {
  it("rejects a file larger than the raw size cap", async () => {
    const file = makeFile(PNG_SIGNATURE);
    Object.defineProperty(file, "size", { value: 9 * 1024 * 1024 });
    await expect(validateAndOptimizeImage(file, { maxDimension: 512 })).rejects.toThrow(
      "too large"
    );
  });

  it("rejects a file whose bytes don't match a known image signature", async () => {
    const file = makeFile([0x23, 0x21, 0x2f, 0x62, 0x69, 0x6e], "fake.png");
    await expect(validateAndOptimizeImage(file, { maxDimension: 512 })).rejects.toThrow(
      "doesn't look like a valid image"
    );
  });

  it("accepts a WEBP signature", async () => {
    const webpBytes = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
    const file = makeFile(webpBytes, "photo.webp", "image/webp");
    stubDecodableBitmap();
    const blob = new Blob(["x"], { type: "image/webp" });
    stubCanvas(blob);

    const result = await validateAndOptimizeImage(file, { maxDimension: 512 });
    expect(result).toBe(blob);
  });

  it("rejects a file that has a valid signature but fails to decode as an image", async () => {
    const file = makeFile(PNG_SIGNATURE);
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("bad image")));

    await expect(validateAndOptimizeImage(file, { maxDimension: 512 })).rejects.toThrow(
      "couldn't be read as an image"
    );
  });

  it("resizes down to maxDimension while preserving aspect ratio, and re-encodes as webp", async () => {
    const file = makeFile(PNG_SIGNATURE);
    stubDecodableBitmap(2000, 1000);
    const blob = new Blob(["x"], { type: "image/webp" });
    let capturedCanvas: { width: number; height: number } | null = null;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
      this: HTMLCanvasElement
    ) {
      capturedCanvas = { width: this.width, height: this.height };
      return { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
    });
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb) => cb(blob));

    const result = await validateAndOptimizeImage(file, { maxDimension: 500 });
    expect(result).toBe(blob);
    expect(capturedCanvas).toEqual({ width: 500, height: 250 });
  });

  it("does not upscale an image smaller than maxDimension", async () => {
    const file = makeFile(PNG_SIGNATURE);
    stubDecodableBitmap(200, 100);
    let capturedCanvas: { width: number; height: number } | null = null;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
      this: HTMLCanvasElement
    ) {
      capturedCanvas = { width: this.width, height: this.height };
      return { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
    });
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb) =>
      cb(new Blob(["x"], { type: "image/webp" }))
    );

    await validateAndOptimizeImage(file, { maxDimension: 512 });
    expect(capturedCanvas).toEqual({ width: 200, height: 100 });
  });

  it("throws when canvas.toBlob produces no blob", async () => {
    const file = makeFile(PNG_SIGNATURE);
    stubDecodableBitmap();
    stubCanvas(null);

    await expect(validateAndOptimizeImage(file, { maxDimension: 512 })).rejects.toThrow(
      "Could not process the image."
    );
  });

  it("throws when 2d context is unavailable", async () => {
    const file = makeFile(PNG_SIGNATURE);
    stubDecodableBitmap();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    await expect(validateAndOptimizeImage(file, { maxDimension: 512 })).rejects.toThrow(
      "Could not process the image."
    );
  });
});

describe("uploadImage", () => {
  function makeFakeSupabase(overrides: { uploadError?: unknown; publicUrl?: string } = {}) {
    const upload = vi.fn().mockResolvedValue({ error: overrides.uploadError ?? null });
    const getPublicUrl = vi
      .fn()
      .mockReturnValue({ data: { publicUrl: overrides.publicUrl ?? "https://cdn.test/x.webp" } });
    const from = vi.fn().mockReturnValue({ upload, getPublicUrl });
    return { storage: { from } } as unknown as Parameters<typeof uploadImage>[0];
  }

  it("uploads the blob and returns its public URL", async () => {
    const supabase = makeFakeSupabase({ publicUrl: "https://cdn.test/store1/staff1/avatar.webp" });
    const blob = new Blob(["x"], { type: "image/webp" });

    const url = await uploadImage(supabase, "avatars", "store1/staff1/avatar.webp", blob);
    expect(url).toBe("https://cdn.test/store1/staff1/avatar.webp");
    expect(supabase.storage.from).toHaveBeenCalledWith("avatars");
  });

  it("throws when the upload fails", async () => {
    const supabase = makeFakeSupabase({ uploadError: { message: "storage full" } });
    const blob = new Blob(["x"], { type: "image/webp" });

    await expect(uploadImage(supabase, "avatars", "path.webp", blob)).rejects.toEqual({
      message: "storage full",
    });
  });
});
