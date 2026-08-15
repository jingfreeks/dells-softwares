import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAuditLog } from "@/lib";
import { ActivityLogCard } from "./ActivityLogCard";

vi.mock("@/lib", async () => {
  const actual = await vi.importActual<typeof import("@/lib")>("@/lib");
  return { ...actual, useAuditLog: vi.fn() };
});

function renderCard() {
  return render(
    <MemoryRouter>
      <ActivityLogCard />
    </MemoryRouter>
  );
}

describe("ActivityLogCard", () => {
  it("shows a loading state", () => {
    vi.mocked(useAuditLog).mockReturnValue({ entries: [], loading: true, loadError: null, onRetry: vi.fn() });
    renderCard();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders real audit log entries", () => {
    vi.mocked(useAuditLog).mockReturnValue({
      entries: [
        {
          id: "log-1",
          action: "sale_voided",
          actionLabel: "Sale voided",
          actorName: "Aling Nena",
          entityLabel: "Receipt 000003",
          reason: "Demo void",
          createdAt: "2026-08-15T08:54:57Z",
        },
      ],
      loading: false,
      loadError: null,
      onRetry: vi.fn(),
    });
    renderCard();
    expect(screen.getByText(/Sale voided · Receipt 000003/)).toBeInTheDocument();
    expect(screen.getByText(/Aling Nena/)).toBeInTheDocument();
    expect(screen.getByText(/Demo void/)).toBeInTheDocument();
  });

  it("shows the empty state when there are no entries", () => {
    vi.mocked(useAuditLog).mockReturnValue({ entries: [], loading: false, loadError: null, onRetry: vi.fn() });
    renderCard();
    expect(screen.getByText("No activity yet.")).toBeInTheDocument();
  });

  it("links Full log to the Settings audit log page", () => {
    vi.mocked(useAuditLog).mockReturnValue({ entries: [], loading: false, loadError: null, onRetry: vi.fn() });
    renderCard();
    expect(screen.getByRole("link", { name: "Full log" })).toHaveAttribute("href", "/settings/audit-log");
  });
});
