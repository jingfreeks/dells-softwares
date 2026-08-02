import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// jsdom's storage objects persist across tests within a file unless
// cleared — without this, sessionStorage-backed features (e.g. the POS
// pending-sale snapshot) leak state from one test into the next.
afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});
