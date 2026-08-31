import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { pickCsvFileText } from "../documentPicker";

const mockText = jest.fn();

jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("expo-file-system", () => ({
  File: jest.fn().mockImplementation((uri: string) => ({ uri, text: () => mockText(uri) })),
}));

describe("pickCsvFileText", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when the user cancels", async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: [] });
    expect(await pickCsvFileText()).toBeNull();
    expect(File).not.toHaveBeenCalled();
  });

  it("reads and returns the picked file's text content", async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/products.csv" }],
    });
    mockText.mockResolvedValue("name,price\nRice,60");

    expect(await pickCsvFileText()).toBe("name,price\nRice,60");
    expect(File).toHaveBeenCalledWith("file:///tmp/products.csv");
    expect(mockText).toHaveBeenCalledWith("file:///tmp/products.csv");
  });
});
