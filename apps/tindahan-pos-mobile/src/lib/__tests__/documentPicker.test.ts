import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { pickCsvFileText } from "./documentPicker";

jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("expo-file-system", () => ({ readAsStringAsync: jest.fn() }));

describe("pickCsvFileText", () => {
  it("returns null when the user cancels", async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: [] });
    expect(await pickCsvFileText()).toBeNull();
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
  });

  it("reads and returns the picked file's text content", async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/products.csv" }],
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue("name,price\nRice,60");

    expect(await pickCsvFileText()).toBe("name,price\nRice,60");
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith("file:///tmp/products.csv");
  });
});
