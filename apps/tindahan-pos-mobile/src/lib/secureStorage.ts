import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Counter, ModeOfOperation } from "aes-js";
import { Buffer } from "buffer";

/**
 * Supabase's session (access + refresh token) is larger than the ~2KB
 * SecureStore/Keychain can hold per key, so it can't be stored there
 * directly. Instead: the session blob lives in AsyncStorage (unencrypted
 * disk storage), encrypted with an AES key that itself lives in
 * SecureStore (iOS Keychain / Android Keystore). A device compromise that
 * only reads app files gets ciphertext; the key never touches disk in
 * plain form. This mirrors Supabase's own documented pattern for Expo.
 */
class LargeSecureStore {
  /** When false, setItem is a no-op (session lives only in memory for
   * this run) — backs the "keep me signed in on this device" toggle. */
  private persistenceEnabled = true;

  setPersistenceEnabled(enabled: boolean): void {
    this.persistenceEnabled = enabled;
  }

  private async getOrCreateKey(keyName: string): Promise<Uint8Array> {
    const existing = await SecureStore.getItemAsync(keyName);
    if (existing) return Uint8Array.from(Buffer.from(existing, "base64"));

    const key = Crypto.getRandomBytes(32);
    await SecureStore.setItemAsync(keyName, Buffer.from(key).toString("base64"));
    return key;
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;

    const keyName = `${key}-secure-key`;
    const encryptionKey = await this.getOrCreateKey(keyName);
    const [ivB64, dataB64] = encrypted.split(":");
    if (!ivB64 || !dataB64) return null;

    const iv = Uint8Array.from(Buffer.from(ivB64, "base64"));
    const data = Uint8Array.from(Buffer.from(dataB64, "base64"));
    const cipher = new ModeOfOperation.ctr(encryptionKey, new Counter(iv));
    const decrypted = cipher.decrypt(data);
    return Buffer.from(decrypted).toString("utf-8");
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!this.persistenceEnabled) {
      await this.removeItem(key);
      return;
    }

    const keyName = `${key}-secure-key`;
    const encryptionKey = await this.getOrCreateKey(keyName);
    const iv = Crypto.getRandomBytes(16);
    const cipher = new ModeOfOperation.ctr(encryptionKey, new Counter(iv));
    const encrypted = cipher.encrypt(Buffer.from(value, "utf-8"));
    const payload = `${Buffer.from(iv).toString("base64")}:${Buffer.from(encrypted).toString("base64")}`;
    await AsyncStorage.setItem(key, payload);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(`${key}-secure-key`);
  }
}

export const largeSecureStore = new LargeSecureStore();
