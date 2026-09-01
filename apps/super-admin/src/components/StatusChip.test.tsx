import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusChip } from "./StatusChip";

describe("StatusChip", () => {
  it("labels each subscription state in words rather than the raw code", () => {
    for (const [status, label] of [
      ["ACTIVE", "Active"],
      ["TRIALING", "Trial"],
      ["PAST_DUE", "Past due"],
      ["SUSPENDED", "Suspended"],
      ["CANCELLED", "Cancelled"],
    ]) {
      const { unmount } = render(<StatusChip status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it("says 'No subscription' rather than rendering an empty chip", () => {
    render(<StatusChip status={null} />);
    expect(screen.getByText("No subscription")).toBeInTheDocument();
  });

  it("lets a cancelled organization outrank an active subscription", () => {
    // core.org_writes_allowed() checks the organization's own status before
    // it looks at billing, so a CANCELLED organization cannot write whatever
    // its subscription row says. The chip has to agree, or the console shows
    // a tenant as Active while the database treats it as closed.
    render(<StatusChip status="ACTIVE" orgStatus="CANCELLED" />);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  it("lets a suspended organization outrank an active subscription", () => {
    render(<StatusChip status="ACTIVE" orgStatus="SUSPENDED" />);
    expect(screen.getByText("Suspended")).toBeInTheDocument();
  });

  it("defers to the subscription when the organization itself is fine", () => {
    // The precedence only runs one way: an ACTIVE organization does not
    // rescue a suspended subscription.
    render(<StatusChip status="SUSPENDED" orgStatus="ACTIVE" />);
    expect(screen.getByText("Suspended")).toBeInTheDocument();
  });

  it("falls back to a neutral label for a status it does not know", () => {
    // Better an honest "No subscription" than a chip rendering a raw
    // enum nobody outside the database recognises.
    render(<StatusChip status="SOMETHING_NEW" />);
    expect(screen.getByText("No subscription")).toBeInTheDocument();
  });
});
