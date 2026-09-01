import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeletionRequests } from "./DeletionRequests";
import {
  approveDeletionRequest,
  denyDeletionRequest,
  listDeletionRequests,
  usePlatform,
} from "../lib/platform";

vi.mock("../lib/platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/platform")>();
  return {
    ...actual,
    usePlatform: vi.fn(),
    listDeletionRequests: vi.fn(),
    approveDeletionRequest: vi.fn(),
    denyDeletionRequest: vi.fn(),
  };
});

const mockedUsePlatform = vi.mocked(usePlatform);
const mockedList = vi.mocked(listDeletionRequests);
const mockedApprove = vi.mocked(approveDeletionRequest);
const mockedDeny = vi.mocked(denyDeletionRequest);

const REQUEST = {
  id: "req-1",
  organizationId: "org-1",
  organizationName: "Aling Nena's Sari-Sari Store",
  requestedByEmail: "owner@example.test",
  requestedAt: "2026-08-30T02:00:00.000Z",
  status: "PENDING",
  reason: "Closing the shop",
} as never;

function asAdmin(scope: string) {
  mockedUsePlatform.mockReturnValue({ admin: { scope } } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedList.mockResolvedValue([REQUEST] as never);
  mockedApprove.mockResolvedValue({ warning: null } as never);
  mockedDeny.mockResolvedValue(undefined as never);
  asAdmin("SUPERUSER");
});

describe("DeletionRequests", () => {
  it("lists pending requests with the organization they belong to", async () => {
    render(<DeletionRequests />);
    expect(await screen.findByText(/Aling Nena's Sari-Sari Store/)).toBeInTheDocument();
  });

  it("surfaces a load failure instead of showing an empty list", async () => {
    // An empty table and a failed fetch look identical to an operator, and
    // one of them means "nothing to do" while the other means "you are not
    // seeing the queue".
    mockedList.mockRejectedValue(new Error("Could not reach the platform API."));
    render(<DeletionRequests />);
    expect(await screen.findByText(/Could not reach the platform API\./)).toBeInTheDocument();
  });

  describe("scope gating", () => {
    it("offers the actions to an ENGINEER", async () => {
      asAdmin("ENGINEER");
      render(<DeletionRequests />);
      await screen.findByText(/Aling Nena/);
      expect(screen.getByRole("button", { name: /review/i })).toBeInTheDocument();
    });

    it("offers no action to a BILLING admin", async () => {
      // Account deletion is a security/ops action, not a billing one, and
      // the same gate exists server-side. Hiding the control is the
      // client half of that pair, not the whole of it.
      asAdmin("BILLING");
      render(<DeletionRequests />);
      await screen.findByText(/Aling Nena/);
      expect(screen.queryByRole("button", { name: /review/i })).not.toBeInTheDocument();
    });
  });

  describe("approving", () => {
    it("requires the confirmation step before it will delete anything", async () => {
      const user = userEvent.setup();
      render(<DeletionRequests />);
      await screen.findByText(/Aling Nena/);

      // Nothing destructive is reachable in one click.
      expect(screen.queryByRole("button", { name: /^approve/i })).not.toBeInTheDocument();
      expect(mockedApprove).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: /review/i }));
      expect(await screen.findByRole("button", { name: /^approve/i })).toBeInTheDocument();
      expect(mockedApprove).not.toHaveBeenCalled();
    });

    it("passes the operator's note through and reloads the queue", async () => {
      const user = userEvent.setup();
      render(<DeletionRequests />);
      await screen.findByText(/Aling Nena/);
      await user.click(screen.getByRole("button", { name: /review/i }));

      const note = screen.getByRole("textbox");
      await user.type(note, "verified by phone");
      await user.click(screen.getByRole("button", { name: /^approve/i }));

      await waitFor(() => expect(mockedApprove).toHaveBeenCalledWith("req-1", "verified by phone"));
      // Reloaded, so the operator never acts twice on a stale row.
      await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
    });

    it("shows the warning the server returns rather than swallowing it", async () => {
      mockedApprove.mockResolvedValue({ warning: "Store had 3 unsettled utang balances." } as never);
      const user = userEvent.setup();
      render(<DeletionRequests />);
      await screen.findByText(/Aling Nena/);
      await user.click(screen.getByRole("button", { name: /review/i }));
      await user.click(screen.getByRole("button", { name: /^approve/i }));

      expect(await screen.findByText(/unsettled utang balances/)).toBeInTheDocument();
    });

    it("reports a failed approval and leaves the request in place", async () => {
      mockedApprove.mockRejectedValue(new Error("UNAUTHORIZED_ACTION"));
      const user = userEvent.setup();
      render(<DeletionRequests />);
      await screen.findByText(/Aling Nena/);
      await user.click(screen.getByRole("button", { name: /review/i }));
      await user.click(screen.getByRole("button", { name: /^approve/i }));

      expect(await screen.findByText(/UNAUTHORIZED_ACTION/)).toBeInTheDocument();
      // Still listed: a failed approval must not look like a completed one.
      expect(screen.getByText(/Aling Nena/)).toBeInTheDocument();
    });
  });

  describe("denying", () => {
    it("passes the note through and reloads", async () => {
      const user = userEvent.setup();
      render(<DeletionRequests />);
      await screen.findByText(/Aling Nena/);
      await user.click(screen.getByRole("button", { name: /review/i }));

      await user.type(screen.getByRole("textbox"), "duplicate request");
      await user.click(screen.getByRole("button", { name: /^deny/i }));

      await waitFor(() => expect(mockedDeny).toHaveBeenCalledWith("req-1", "duplicate request"));
      await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
    });

    it("never calls approve when denying", async () => {
      const user = userEvent.setup();
      render(<DeletionRequests />);
      await screen.findByText(/Aling Nena/);
      await user.click(screen.getByRole("button", { name: /review/i }));
      await user.click(screen.getByRole("button", { name: /^deny/i }));

      await waitFor(() => expect(mockedDeny).toHaveBeenCalled());
      expect(mockedApprove).not.toHaveBeenCalled();
    });
  });
});
