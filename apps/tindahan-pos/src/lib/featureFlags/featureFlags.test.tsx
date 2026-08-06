import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FeatureFlag, FeatureFlagsProvider, useFeatureFlag } from "./featureFlags";
import { supabase } from "../supabaseClient";

vi.mock("../supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

const mockedSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>;
  channel: ReturnType<typeof vi.fn>;
  removeChannel: ReturnType<typeof vi.fn>;
};

function mockFlagsResponse(data: { key: string; enabled: boolean }[] | null, error: unknown = null) {
  mockedSupabase.from.mockReturnValue({
    select: vi.fn().mockResolvedValue({ data, error }),
  });
}

let capturedChangeHandler: ((payload: unknown) => void) | null = null;

function mockChannel() {
  const channelObj = {
    on: vi.fn((_event: string, _filter: unknown, cb: (payload: unknown) => void) => {
      capturedChangeHandler = cb;
      return channelObj;
    }),
    subscribe: vi.fn().mockReturnThis(),
  };
  mockedSupabase.channel.mockReturnValue(channelObj);
  return channelObj;
}

function Probe({ flagKey }: { flagKey: string }) {
  const enabled = useFeatureFlag(flagKey);
  return <p data-testid="flag">{String(enabled)}</p>;
}

describe("FeatureFlagsProvider", () => {
  it("throws when useFeatureFlag is used outside a provider", () => {
    function Bad() {
      useFeatureFlag("x");
      return null;
    }
    expect(() => render(<Bad />)).toThrow("useFeatureFlag must be used within FeatureFlagsProvider");
  });

  it("defaults an unregistered flag to enabled", async () => {
    mockFlagsResponse([]);
    mockChannel();
    render(
      <FeatureFlagsProvider>
        <Probe flagKey="pack_pricing" />
      </FeatureFlagsProvider>
    );
    await waitFor(() => expect(screen.getByTestId("flag")).toHaveTextContent("true"));
  });

  it("reflects a disabled flag from the database", async () => {
    mockFlagsResponse([{ key: "pack_pricing", enabled: false }]);
    mockChannel();
    render(
      <FeatureFlagsProvider>
        <Probe flagKey="pack_pricing" />
      </FeatureFlagsProvider>
    );
    await waitFor(() => expect(screen.getByTestId("flag")).toHaveTextContent("false"));
  });

  it("fails open when the initial load errors", async () => {
    mockFlagsResponse(null, { message: "network down" });
    mockChannel();
    render(
      <FeatureFlagsProvider>
        <Probe flagKey="pack_pricing" />
      </FeatureFlagsProvider>
    );
    await waitFor(() => expect(screen.getByTestId("flag")).toHaveTextContent("true"));
  });

  it("applies a realtime UPDATE/INSERT change", async () => {
    mockFlagsResponse([{ key: "pack_pricing", enabled: true }]);
    mockChannel();
    render(
      <FeatureFlagsProvider>
        <Probe flagKey="pack_pricing" />
      </FeatureFlagsProvider>
    );
    await waitFor(() => expect(screen.getByTestId("flag")).toHaveTextContent("true"));

    capturedChangeHandler!({ eventType: "UPDATE", new: { key: "pack_pricing", enabled: false } });
    await waitFor(() => expect(screen.getByTestId("flag")).toHaveTextContent("false"));
  });

  it("applies a realtime DELETE change by reverting to fail-open", async () => {
    mockFlagsResponse([{ key: "pack_pricing", enabled: false }]);
    mockChannel();
    render(
      <FeatureFlagsProvider>
        <Probe flagKey="pack_pricing" />
      </FeatureFlagsProvider>
    );
    await waitFor(() => expect(screen.getByTestId("flag")).toHaveTextContent("false"));

    capturedChangeHandler!({ eventType: "DELETE", old: { key: "pack_pricing" } });
    await waitFor(() => expect(screen.getByTestId("flag")).toHaveTextContent("true"));
  });

  it("ignores a DELETE payload with no key", async () => {
    mockFlagsResponse([{ key: "pack_pricing", enabled: false }]);
    mockChannel();
    render(
      <FeatureFlagsProvider>
        <Probe flagKey="pack_pricing" />
      </FeatureFlagsProvider>
    );
    await waitFor(() => expect(screen.getByTestId("flag")).toHaveTextContent("false"));

    capturedChangeHandler!({ eventType: "DELETE", old: {} });
    await waitFor(() => expect(screen.getByTestId("flag")).toHaveTextContent("false"));
  });

  it("renders children via FeatureFlag only while enabled", async () => {
    mockFlagsResponse([{ key: "pos_services", enabled: false }]);
    mockChannel();
    render(
      <FeatureFlagsProvider>
        <FeatureFlag flag="pos_services">
          <p>Services UI</p>
        </FeatureFlag>
      </FeatureFlagsProvider>
    );
    await waitFor(() => expect(screen.queryByText("Services UI")).not.toBeInTheDocument());
  });

  it("renders FeatureFlag children when enabled", async () => {
    mockFlagsResponse([{ key: "pos_services", enabled: true }]);
    mockChannel();
    render(
      <FeatureFlagsProvider>
        <FeatureFlag flag="pos_services">
          <p>Services UI</p>
        </FeatureFlag>
      </FeatureFlagsProvider>
    );
    expect(await screen.findByText("Services UI")).toBeInTheDocument();
  });
});
