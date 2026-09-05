import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NoAccess } from "../NoAccess";

const refresh = vi.fn();
const signOut = vi.fn();
vi.mock("@/lib", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSession: () => ({ session: null, access: "no-permission", refresh, signOut }),
}));

/**
 * The property under test is the one the design cares about: these four cases
 * must not read alike. Someone shown a generic "no access" retypes a correct
 * password until they give up, which is the dead end this screen exists to
 * prevent.
 */
describe("NoAccess", () => {
  it("tells a permissions wall from a login failure, in words", () => {
    render(<NoAccess reason="no-permission" />);
    expect(screen.getByText(/sign-in worked/i)).toBeInTheDocument();
    expect(screen.getByText(/permissions boundary, not a login problem/i)).toBeInTheDocument();
  });

  it("does not offer to sign in again where a password would not help", () => {
    render(<NoAccess reason="no-permission" />);
    expect(screen.queryByText(/^sign in$/i)).not.toBeInTheDocument();
  });

  it("says the books still exist when the plan no longer includes the module", () => {
    render(<NoAccess reason="module-off" />);
    // §08: a downgrade refuses new writes and keeps every read. The screen
    // must not imply the records were taken away.
    expect(screen.getByText(/have not been deleted/i)).toBeInTheDocument();
  });

  it("offers a retry only for a failed check, which is the only retryable case", () => {
    render(<NoAccess reason="error" />);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("asks for a sign-in only when nobody is signed in", () => {
    render(<NoAccess reason="signed-out" />);
    expect(screen.getByText(/sign in through tindahan pos/i)).toBeInTheDocument();
  });
});
