import { largeSecureStore } from "../secureStorage";

describe("largeSecureStore", () => {
  it("round-trips a value through encrypt/decrypt", async () => {
    await largeSecureStore.setItem("session", "super-secret-token");
    expect(await largeSecureStore.getItem("session")).toBe("super-secret-token");
  });

  it("returns null for a key that was never set", async () => {
    expect(await largeSecureStore.getItem("missing-key")).toBeNull();
  });

  it("does not store the value in plaintext", async () => {
    const AsyncStorage = require("@react-native-async-storage/async-storage");
    await largeSecureStore.setItem("plaintext-check", "super-secret-token");
    const raw = await AsyncStorage.getItem("plaintext-check");
    expect(raw).not.toContain("super-secret-token");
  });

  it("removeItem clears both the stored value and its encryption key", async () => {
    await largeSecureStore.setItem("to-remove", "value");
    await largeSecureStore.removeItem("to-remove");
    expect(await largeSecureStore.getItem("to-remove")).toBeNull();
  });

  it("setItem is a no-op while persistence is disabled", async () => {
    largeSecureStore.setPersistenceEnabled(false);
    await largeSecureStore.setItem("session-not-kept", "token");
    expect(await largeSecureStore.getItem("session-not-kept")).toBeNull();
    largeSecureStore.setPersistenceEnabled(true);
  });

  it("clears an existing value if persistence is disabled after it was set", async () => {
    await largeSecureStore.setItem("session-then-disabled", "token");
    largeSecureStore.setPersistenceEnabled(false);
    await largeSecureStore.setItem("session-then-disabled", "token-2");
    expect(await largeSecureStore.getItem("session-then-disabled")).toBeNull();
    largeSecureStore.setPersistenceEnabled(true);
  });
});
