import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("supabaseClient", () => {
  it("throws when VITE_SUPABASE_URL is missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    await expect(import("./supabaseClient")).rejects.toThrow(/Missing VITE_SUPABASE_URL/);
  });

  it("throws when VITE_SUPABASE_ANON_KEY is missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    await expect(import("./supabaseClient")).rejects.toThrow(/Missing VITE_SUPABASE_URL/);
  });

  it("creates a client when both env vars are present", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    const { supabase } = await import("./supabaseClient");
    expect(supabase).toBeDefined();
  });
});
