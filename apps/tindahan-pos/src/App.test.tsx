import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./lib/supabaseClient", () => {
  const query: Record<string, unknown> = {};
  query.select = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.limit = vi.fn(() => Promise.resolve({ data: [], error: null }));
  query.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });

  return {
    supabase: {
      from: vi.fn(() => query),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      })),
      removeChannel: vi.fn(),
    },
  };
});

import App from "./App";

describe("App", () => {
  it("redirects an unauthenticated visitor to the login page", async () => {
    render(<App />);
    expect(await screen.findByText(/Log in to/)).toBeInTheDocument();
  });
});
