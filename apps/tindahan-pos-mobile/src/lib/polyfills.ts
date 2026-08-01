import "react-native-url-polyfill/auto";
import { Buffer } from "buffer";

const globalScope = globalThis as typeof globalThis & { Buffer?: typeof Buffer };
if (typeof globalScope.Buffer === "undefined") {
  globalScope.Buffer = Buffer;
}
