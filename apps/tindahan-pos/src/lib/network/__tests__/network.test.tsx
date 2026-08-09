import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NetworkProvider } from "../network";
import { useNetworkStatus } from "../networkContext";

function Probe() {
  const { isOnline, lastCheckedAt, checkNow } = useNetworkStatus();
  return (
    <div>
      <p data-testid="online">{String(isOnline)}</p>
      <p data-testid="checked-at">{lastCheckedAt ?? "never"}</p>
      <button onClick={() => checkNow()}>check</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <NetworkProvider>
      <Probe />
    </NetworkProvider>
  );
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("NetworkProvider", () => {
  it("reports online after a successful reachability probe", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("checked-at")).not.toHaveTextContent("never"));
    expect(screen.getByTestId("online")).toHaveTextContent("true");
  });

  it("reports offline when the reachability probe fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("checked-at")).not.toHaveTextContent("never"));
    expect(screen.getByTestId("online")).toHaveTextContent("false");
  });

  it("re-probes on a manual checkNow() call", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    renderProbe();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await user.click(screen.getByRole("button", { name: "check" }));
    await waitFor(() => expect(screen.getByTestId("online")).toHaveTextContent("false"));
  });

  it("immediately probes again on a window 'online' event", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    renderProbe();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("goes offline immediately on a window 'offline' event, without waiting for a probe", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("online")).toHaveTextContent("true"));

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByTestId("online")).toHaveTextContent("false");
  });
});
