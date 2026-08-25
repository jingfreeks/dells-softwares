import { Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { pickAndOptimizeImage, uploadImage } from "./imageUpload";

const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();

jest.mock("./supabaseClient", () => ({
  supabase: {
    storage: {
      from: (bucket: string) => ({
        upload: (...args: unknown[]) => mockUpload(bucket, ...args),
        getPublicUrl: (...args: unknown[]) => mockGetPublicUrl(bucket, ...args),
      }),
    },
  },
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));

jest.mock("expo-file-system", () => ({
  getInfoAsync: jest.fn(),
}));

describe("pickAndOptimizeImage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, size: 1000 });
    jest.spyOn(Image, "getSize").mockImplementation((_uri, success) => success(2000, 1000));
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: "file:///tmp/optimized.jpg",
      base64: "b64data",
    });
  });

  it("returns null when the user cancels", async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: [] });
    expect(await pickAndOptimizeImage(512)).toBeNull();
  });

  it("throws if permission is denied", async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
    await expect(pickAndOptimizeImage(512)).rejects.toThrow("Photo library permission is required");
  });

  it("rejects a picked file over 8MB before attempting to optimize it", async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/huge.jpg" }],
    });
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, size: 9 * 1024 * 1024 });

    await expect(pickAndOptimizeImage(512)).rejects.toThrow("too large");
    expect(ImageManipulator.manipulateAsync).not.toHaveBeenCalled();
  });

  it("scales the longer edge down to maxDimension, preserving aspect ratio", async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/pic.jpg" }],
    });
    // 2000x1000 source, cap at 512 -> scale 0.256 -> 512x256
    await pickAndOptimizeImage(512);

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///tmp/pic.jpg",
      [{ resize: { width: 512, height: 256 } }],
      expect.objectContaining({ format: "jpeg", base64: true })
    );
  });

  it("never upscales an image already smaller than maxDimension", async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/small.jpg" }],
    });
    jest.spyOn(Image, "getSize").mockImplementation((_uri, success) => success(100, 50));

    await pickAndOptimizeImage(512);

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith("file:///tmp/small.jpg", [], expect.anything());
  });

  it("returns the optimized uri/base64/contentType", async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/pic.jpg" }],
    });

    const result = await pickAndOptimizeImage(512);
    expect(result).toEqual({ uri: "file:///tmp/optimized.jpg", base64: "b64data", contentType: "image/jpeg" });
  });
});

describe("uploadImage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: "https://cdn.test/avatars/s1/u1/avatar.jpg" } });
  });

  it("uploads with upsert and the given content type, then returns the public URL", async () => {
    const url = await uploadImage("avatars", "s1/u1/avatar.jpg", {
      uri: "file:///tmp/x.jpg",
      base64: "aGVsbG8=",
      contentType: "image/jpeg",
    });

    expect(mockUpload).toHaveBeenCalledWith(
      "avatars",
      "s1/u1/avatar.jpg",
      expect.any(ArrayBuffer),
      { upsert: true, contentType: "image/jpeg" }
    );
    expect(url).toBe("https://cdn.test/avatars/s1/u1/avatar.jpg");
  });

  it("throws the Supabase error on failure", async () => {
    mockUpload.mockResolvedValue({ error: new Error("storage full") });
    await expect(
      uploadImage("avatars", "s1/u1/avatar.jpg", { uri: "x", base64: "aGVsbG8=", contentType: "image/jpeg" })
    ).rejects.toThrow("storage full");
  });
});
