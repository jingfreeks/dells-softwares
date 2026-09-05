import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// jsdom's storage objects persist across tests within a file unless
// cleared — without this, sessionStorage-backed features (e.g. the POS
// pending-sale snapshot) leak state from one test into the next.
afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

// jsdom doesn't implement IntersectionObserver. This inert stub lets any
// component that observes a scroll sentinel (e.g. the POS product grid's
// infinite-scroll batching) mount without throwing; it never actually fires
// — tests that need to simulate a scroll-into-view call `loadMore()`/the
// component's own logic directly instead of relying on real intersection.
class IntersectionObserverStub implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly scrollMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

(globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
  IntersectionObserverStub;
