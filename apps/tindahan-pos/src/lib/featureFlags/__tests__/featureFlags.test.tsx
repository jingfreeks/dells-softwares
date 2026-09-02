import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FeatureFlag, FeatureFlagsProvider } from "../featureFlags";
import { useFeatureFlag } from "../featureFlagsContext";
import { supabase } from "../../supabaseClient";

vi.mock("../../supabaseClient", () => ({
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
let capturedSubscribeCallback: ((status: string) => void) | null = null;

function mockChannel() {
  const channelObj = {
    on: vi.fn((_event: string, _filter: unknown, cb: (payload: unknown) => void) => {
      capturedChangeHandler = cb;
      return channelObj;
    }),
    subscribe: vi.fn((cb?: (status: string) => void) => {
      capturedSubscribeCallback = cb ?? null;
      return channelObj;
    }),
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

describe("staleness after a dropped or slept-through connection", () => {
  // postgres_changes does not replay what was missed while the socket was
  // down, and realtime-js rejoins silently. Without re-reading the table,
  // a kill switch flipped while a till slept overnight would never arrive:
  // the socket comes back healthy and the app serves yesterday's answer.

  it("re-reads the flags whenever the channel (re)subscribes", async () => {
    mockFlagsResponse([{ key: "pack_pricing", enabled: true }]);
    mockChannel();
    render(
      <FeatureFlagsProvider>
        <Probe flagKey="pack_pricing" />
      </FeatureFlagsProvider>
    );
    await waitFor(() => expect(screen.getByTestId("flag")).toHaveTextContent("true"));

    // The flag is turned off while this client is not listening.
    mockFlagsResponse([{ key: "pack_pricing", enabled: false }]);
    capturedSubscribeCallback?.("SUBSCRIBED");

    await waitFor(() => expect(screen.getByTestId("flag")).toHaveTextContent("false"));
  });

  it("re-reads the flags when a backgrounded tab is brought back", async () => {
    // The cashier wakes the till; no realtime event announces that.
    mockFlagsResponse([{ key: "pack_pricing", enabled: true }]);
    mockChannel();
    render(
      <FeatureFlagsProvider>
        <Probe flagKey="pack_pricing" />
      </FeatureFlagsProvider>
    );
    await waitFor(() => expect(screen.getByTestId("flag")).toHaveTextContent("true"));

    mockFlagsResponse([{ key: "pack_pricing", enabled: false }]);
    document.dispatchEvent(new Event("visibilitychange"));

    await waitFor(() => expect(screen.getByTestId("flag")).toHaveTextContent("false"));
  });

  it("re-reads the flags when connectivity returns", async () => {
    mockFlagsResponse([{ key: "pack_pricing", enabled: true }]);
    mockChannel();
    render(
      <FeatureFlagsProvider>
        <Probe flagKey="pack_pricing" />
      </FeatureFlagsProvider>
    );
    await waitFor(() => expect(screen.getByTestId("flag")).toHaveTextContent("true"));

    mockFlagsResponse([{ key: "pack_pricing", enabled: false }]);
    window.dispatchEvent(new Event("online"));

    await waitFor(() => expect(screen.getByTestId("flag")).toHaveTextContent("false"));
  });

  it("keeps the last known flags when a re-read fails, rather than failing open mid-session", async () => {
    // Fail-open is the right default at startup, when nothing is known. It
    // is the wrong answer for a re-read: a flag already known to be off
    // must not switch back on because the network blipped.
    mockFlagsResponse([{ key: "pack_pricing", enabled: false }]);
    mockChannel();
    render(
      <FeatureFlagsProvider>
        <Probe flagKey="pack_pricing" />
      </FeatureFlagsProvider>
    );
    await waitFor(() => expect(screen.getByTestId("flag")).toHaveTextContent("false"));

    mockFlagsResponse(null, { message: "network down" });
    window.dispatchEvent(new Event("online"));

    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByTestId("flag")).toHaveTextContent("false");
  });
});

