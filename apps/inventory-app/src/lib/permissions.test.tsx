import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Driven through the real provider: useAccessDenied() reaches the context by
// its own module-internal reference, so mocking usePermissions() would not be
// the call it makes. This also covers list_my_permissions()'s row shape.
const rpc = vi.fn();
vi.mock("./supabaseClient", () => ({ supabase: { rpc: (n: string) => rpc(n) } }));
vi.mock("./auth", () => ({ useAuth: () => ({ user: { id: "staff-1" } }) }));

const { PermissionsProvider, useAccessDenied, useCan } = await import("./permissions");

function Probe({ code }: { code: string }) {
  return (
    <>
      <span data-testid="denied">{useAccessDenied(code) ? "denied" : "allowed"}</span>
      <span data-testid="can">{useCan(code) ? "can" : "cannot"}</span>
    </>
  );
}

function mount(code: string) {
  render(
    <PermissionsProvider>
      <Probe code={code} />
    </PermissionsProvider>
  );
  return {
    denied: () => screen.getByTestId("denied").textContent,
    can: () => screen.getByTestId("can").textContent,
  };
}

beforeEach(() => {
  rpc.mockReset();
});

describe("useAccessDenied", () => {
  // THE regression. Nine pages redirected on !useCan(...), which is false
  // while the fetch is in flight -- so opening any of them directly threw the
  // owner to the dashboard before their own permissions arrived. A redirect is
  // not recoverable the way a late-appearing button is.
  it("does not deny while permissions are still loading", async () => {
    // Held open deliberately, then settled before the test ends -- leaving a
    // promise pending past cleanup hangs testing-library's teardown.
    let settle: (v: unknown) => void = () => {};
    rpc.mockReturnValue(new Promise((r) => { settle = r; }));
    const read = mount("inventory.purchase_order.manage");

    expect(read.denied()).toBe("allowed");
    // useCan still fails closed in the same instant, deliberately, and the
    // difference between the two is the entire fix.
    expect(read.can()).toBe("cannot");

    settle({ data: [], error: null });
    await waitFor(() => expect(read.denied()).toBe("denied"));
  });

  it("denies once the answer arrives and the permission is absent", async () => {
    rpc.mockResolvedValue({ data: ["inventory.supplier.manage"], error: null });
    const read = mount("inventory.purchase_order.manage");
    await waitFor(() => expect(read.denied()).toBe("denied"));
  });

  it("allows once the answer arrives and the permission is held", async () => {
    rpc.mockResolvedValue({ data: ["inventory.purchase_order.manage"], error: null });
    const read = mount("inventory.purchase_order.manage");
    await waitFor(() => expect(read.can()).toBe("can"));
    expect(read.denied()).toBe("allowed");
  });

  // A failed read resolves loading, so the page must decide. Denying is right:
  // unlike the loading case this IS an answer, the server would refuse the
  // write anyway, and a page that renders its controls over an empty
  // permission set is more confusing than being turned away.
  it("denies when the read fails, rather than hanging open forever", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("network") });
    const read = mount("inventory.purchase_order.manage");
    await waitFor(() => expect(read.denied()).toBe("denied"));
  });
});
